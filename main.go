package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"github.com/fthvgb1/wp-go/helper"
	"github.com/fthvgb1/wp-go/helper/number"
	"github.com/fthvgb1/wp-go/helper/slice"
	"github.com/go-vgo/robotgo"
	"golang.design/x/clipboard"
	"log"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"
)

var addr string
var mux = sync.Mutex{}
var timeout time.Duration
var logfile string

func main() {
	flag.StringVar(&addr, "p", "127.0.0.1:9999", "httpserver listen port")
	flag.DurationVar(&timeout, "t", 15*time.Second, "ocr watch timeout")
	flag.StringVar(&logfile, "log", "stdout", "logfile path default stdout")
	flag.Parse()
	if logfile != "" && logfile != "stdout" {
		f, err := os.OpenFile(logfile, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0777)
		if err != nil {
			log.Println(err, "will use stdout")
		} else {
			defer f.Close()
			log.SetOutput(f)
		}
	}
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
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
	})

	http.HandleFunc("/aca", ActionCopyAction)

	http.HandleFunc("/cmd", Cmd)
	log.Println("http listened ", addr)
	err := http.ListenAndServe(addr, nil)
	if err != nil {
		panic(err)
	}
}

func ActionCopyAction(w http.ResponseWriter, r *http.Request) {
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

func Cmd(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if re := recover(); re != nil {
			log.Println(re)
			w.WriteHeader(http.StatusInternalServerError)
		}
	}()
	err := r.ParseForm()
	if err != nil {
		log.Println(err)
		return
	}
	var envFn []func()
	defer func() {
		if len(envFn) > 0 {
			for _, f := range envFn {
				f()
			}
		}
	}()
	if len(r.Form["env"]) > 0 {
		path := os.Getenv("PATH")
		split := helper.Or(strings.ToLower(runtime.GOOS) == "windows", ";", ":")
		for _, s := range r.Form["env"] {
			v := strings.Split(s, "=")
			if v[0] == "PATH" {
				v[1] = os.ExpandEnv(fmt.Sprintf("$PATH%s%s", split, v[1]))
				envFn = append(envFn, func() {
					err = os.Setenv("PATH", path)
					if err != nil {
						log.Println(err)
					}
				})
			} else {
				envFn = append(envFn, func() {
					err = os.Unsetenv(v[0])
					if err != nil {
						log.Println(err)
					}
				})
			}
			err = os.Setenv(v[0], v[1])
			if err != nil {
				log.Println(err)
				return
			}
		}
	}
	var res bool
	if helper.Defaults(r.Form.Get("res"), "1") == "1" {
		res = true
	}
	if len(r.Form["cmd"]) > 1 {
		b, err := execCMDs(r.Form["cmd"], res, r.Form)
		if err != nil {
			log.Println(err)
			return
		}
		_, err = w.Write(b)
		if err != nil {
			log.Println(err)
			return
		}
		return
	}
	cmd := r.Form.Get("cmd")
	if cmd == "" {
		return
	}
	var args []string
	if len(r.Form["args"]) > 1 {
		args = r.Form["args"]
	} else if len(r.Form["args"]) == 1 {
		args = parseArgs(r.Form["args"][0])
	}

	re, err := execCMD(cmd, res, args...)
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

func execCMDs(cmds []string, res bool, args map[string][]string) ([]byte, error) {
	var b bytes.Buffer
	var i = 0
	var commands []*exec.Cmd

	fmt.Println(os.Environ())
	cm := slice.Reduce(cmds[1:], func(t string, r *exec.Cmd) *exec.Cmd {
		if r == nil {
			return nil
		}
		i++
		commands = append(commands, r)
		cmd := exec.Command(cmds[i], args[number.IntToString(i)]...)
		out, err := r.StdoutPipe()
		if err != nil {
			log.Println(err)
			return nil
		}
		cmd.Stdin = out
		if i == len(cmds)-1 {
			cmd.Stdout = &b
		}
		return cmd
	}, exec.Command(cmds[0], args["0"]...))
	commands = append(commands, cm)
	var err error
	for _, command := range commands {
		err = command.Start()
		if err != nil {
			return nil, err
		}
	}
	for j, command := range commands {
		err = command.Wait()
		if err != nil {
			return nil, err
		}
		if j == len(commands)-1 && !res {
			go func() {
				err = command.Wait()
				if err != nil {
					log.Println(err)
				}
			}()
			return nil, nil
		}
	}
	return b.Bytes(), err
}

func execCMD(cmd string, res bool, args ...string) ([]byte, error) {
	cm := exec.Command(cmd, args...)
	if res {
		return cm.CombinedOutput()
	}
	err := cm.Start()
	if err != nil {
		return nil, err
	}
	go func() {
		err = cm.Wait()
		if err != nil {
			log.Println(err)
		}
	}()
	return nil, nil
}

func parseArgs(a string) (r []string) {
	if a == "" {
		return
	}
	fn := func(s []rune) string {
		if s[0] == '"' || s[0] == '\'' && s[0] == s[len(s)-1] {
			return strings.Trim(string(s), string(s[0]))
		}
		return string(s)
	}
	s := []rune(a)
	var arg []rune
	var start bool
	var quote rune
	var quoteNum int
	for i := 0; i < len(s); i++ {
		if s[i] == ' ' && !start {
			continue
		}

		if s[i] == ' ' && start && quote == 0 || i > 1 && s[i-1] == quote && i-1 != quoteNum {
			start = false
			r = append(r, fn(arg))
			arg = arg[:0]
			quote = 0
			quoteNum = 0
			continue
		}
		if quote == 0 && s[i] == '"' || s[i] == '\'' {
			quote = s[i]
			quoteNum = i
		}
		start = true
		arg = append(arg, s[i])
		if i == len(s)-1 {
			r = append(r, fn(arg))
		}
	}
	return
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
