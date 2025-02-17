package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"github.com/fthvgb1/goldendict-browser-helper/executecmd"
	"github.com/fthvgb1/wp-go/helper"
	"github.com/fthvgb1/wp-go/helper/slice"
	str "github.com/fthvgb1/wp-go/helper/strings"
	"github.com/go-vgo/robotgo"
	"golang.design/x/clipboard"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

var port int
var mux = sync.Mutex{}
var timeout time.Duration
var logfile string

func main() {
	flag.IntVar(&port, "p", 9999, "httpserver listen port")
	flag.DurationVar(&timeout, "t", 15*time.Second, "ocr watch timeout")
	flag.StringVar(&logfile, "log", "stdout", "logfile path default stdout")
	flag.Parse()
	if logfile != "" && logfile != "stdout" {
		f, err := os.OpenFile(logfile, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0666)
		if err != nil {
			log.Println(err, "will use stdout")
		} else {
			defer f.Close()
			log.SetOutput(f)
		}
	}
	http.HandleFunc("/", tapKeyboardAndCopy)
	http.HandleFunc("/aca", ActionCopyAction)
	http.HandleFunc("/cmd", executeCmd)
	http.HandleFunc("/clipboard", ReadClipboard)
	http.HandleFunc("/typeStr", typeStr)
	log.Println("http listened ", port)
	err := http.ListenAndServe(fmt.Sprintf("127.0.0.1:%d", port), nil)
	if err != nil {
		panic(err)
	}
}

func typeStr(_ http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		log.Println(err)
		return
	}
	text := r.Form.Get("text")
	if text == "" {
		return
	}
	pids := r.Form.Get("pid")
	pid := str.ToInteger[int](pids, 0)
	if pid > 0 {
		robotgo.TypeStr(text, pid)
	} else {
		robotgo.TypeStr(text)
	}

}

func ReadClipboard(w http.ResponseWriter, r *http.Request) {
	s := r.URL.Query().Get("type")
	format := clipboard.FmtText
	if s == "img" {
		format = clipboard.FmtImage
	}
	_, err := w.Write(clipboard.Read(format))
	if err != nil {
		log.Println(err)
	}
}

func tapKeyboardAndCopy(w http.ResponseWriter, r *http.Request) {
	if r.RequestURI == "/favicon.ico" {
		return
	}
	err := r.ParseForm()
	if err != nil {
		log.Println(err)
		return
	}
	text := r.Form.Get("text")
	if text != "" {
		log.Println("copied:", text)
		clipboard.Write(clipboard.FmtText, []byte(text))
	}
	keys, err := parseKeyboard(r, "keys")
	if err != nil {
		log.Println(err)
	}
	if len(keys) < 1 {
		return
	}
	err = tapKeyboard(keys)
	if err != nil {
		panic(err)
	}
}

func ActionCopyAction(_ http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		log.Println(err)
		return
	}
	actionPrev, err := parseKeyboard(r, "prev")
	if err != nil {
		log.Println(err)
		return
	}
	actionNext, err := parseKeyboard(r, "next")
	if err != nil {
		log.Println(err)
		return
	}
	err = tapKeyboard(actionPrev)
	if err != nil {
		panic(err)
	}
	t := timeout
	times := r.Form.Get("timeout")
	if times != "" {
		duration, err := time.ParseDuration(times)
		if err == nil {
			t = duration
		} else {
			log.Println(times, err)
		}
	}

	ctx, cancel := context.WithTimeout(context.TODO(), t)
	defer cancel()
	ch := clipboard.Watch(ctx, clipboard.FmtText)
	for {
		select {
		case <-ctx.Done():
			log.Println("watch clipboard timeout")
			return
		case str := <-ch:
			if len(str) < 1 {
				return
			}
			log.Println("copied:", string(str))
			clipboard.Write(clipboard.FmtText, str)
			err = tapKeyboard(actionNext)
			return
		}
	}
}

func executeCmd(w http.ResponseWriter, r *http.Request) {
	var envFn []func()
	defer func() {
		if re := recover(); re != nil {
			log.Println(re)
			w.WriteHeader(http.StatusInternalServerError)
		}
		if len(envFn) > 0 {
			defer func() {
				envMutex.Unlock()
			}()
			envMutex.Lock()
			for _, f := range envFn {
				f()
			}
		}
	}()
	err := r.ParseForm()
	if err != nil {
		log.Println(err)
		return
	}

	if len(r.Form["env"]) > 0 {
		err = setEnv(&envFn, r.Form["env"])
		if err != nil {
			log.Println(err)
			return
		}
	}
	var res bool
	if helper.Defaults(r.Form.Get("res"), "1") == "1" {
		res = true
	}
	var cmd string
	var args []string
	var re []byte
	if len(r.Form["cmd"]) > 1 {
		cmd, re, err = executecmd.PipeExecCMDs(r.Form["cmd"], res, r.Form)
	} else if len(r.Form["cmd"]) == 1 {
		cmd = r.Form.Get("cmd")
		if cmd == "" {
			return
		}
		if len(r.Form["args"]) > 1 {
			args = r.Form["args"]
		} else if len(r.Form["args"]) == 1 {
			args = executecmd.ParseArgs(r.Form["args"][0])
		}
		if r.Form.Get("sh") == "1" {
			re, err = executecmd.ShellCmd(cmd, res, r.Form["args"])
		} else {
			re, err = executecmd.ExecCMD(cmd, res, nil, args...)
		}
	} else {
		return
	}

	if err != nil {
		log.Println("execute cmd:", cmd, "err:", err)
		return
	}
	_, err = w.Write(re)
	if err != nil {
		log.Println(err)
		return
	}
	a := append([]string{"executed cmd:", cmd}, args...)
	log.Println(slice.ToAnySlice(a)...)
}

var envMutex sync.Mutex

func setEnv(fn *[]func(), envs []string) error {
	defer func() {
		envMutex.Unlock()
	}()
	envMutex.Lock()
	for _, env := range envs {
		v := strings.Split(env, "=")
		old := os.Getenv(v[0])
		*fn = append(*fn, func() {
			var err error
			if old != "" {
				err = os.Setenv(v[0], old)
			} else {
				err = os.Unsetenv(v[0])
			}
			if err != nil {
				log.Println(err)
			}
		})
		err := os.Setenv(v[0], os.ExpandEnv(v[1]))
		if err != nil {
			return err
		}
	}
	return nil
}

func parseKeyboard(r *http.Request, key string) ([]any, error) {
	keys := r.Form.Get(key)
	if keys == "" {
		return nil, nil
	}
	var a []any
	err := json.Unmarshal([]byte(keys), &a)
	if err != nil {
		log.Println(err)
		return nil, err
	}
	return a, nil
}

func tapKeyboard(a []any) error {
	mux.Lock()
	defer mux.Unlock()
	for _, item := range a {
		k, ok := item.([]any)
		if !ok {
			continue
		}
		if len(k) > 1 {
			k = slice.Map(k, func(t any) any {
				v, ok := t.(float64)
				if ok {
					return int(v)
				}
				return t
			})
			key := k[0].(string)
			err := robotgo.KeyTap(key, k[1:]...)
			if err != nil {
				return err
			}
			keys := slice.Map(append(k[1:], k[0]), func(t any) string {
				v, ok := t.(string)
				if ok {
					return v
				}
				return strconv.Itoa(t.(int))
			})
			keysStr := strings.Join(keys, "+")
			log.Println("taped:", keysStr)
		} else {
			err := robotgo.KeyTap(k[0].(string))
			if err != nil {
				return err
			}
			log.Println("taped ", k[0])
		}
	}
	return nil
}
