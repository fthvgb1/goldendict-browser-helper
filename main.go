package main

import (
	"context"
	"encoding/json"
	"flag"
	"github.com/fthvgb1/wp-go/helper/slice"
	"github.com/go-vgo/robotgo"
	"golang.design/x/clipboard"
	"log"
	"net/http"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"
)

var addr string
var mux = sync.Mutex{}
var timeout time.Duration

func main() {
	flag.StringVar(&addr, "p", "127.0.0.1:9999", "httpserver listen port")
	flag.DurationVar(&timeout, "t", 15*time.Second, "ocr watch timeout")
	flag.Parse()
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

	// action copy action
	http.HandleFunc("/aca", func(w http.ResponseWriter, r *http.Request) {
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
	})

	http.HandleFunc("/cmd", func(w http.ResponseWriter, r *http.Request) {
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
		_, err = w.Write(execCMD(cmd, args...))
		if err != nil {
			log.Println(err)
			return
		}
		a := append([]string{"executed cmd:", cmd}, args...)
		log.Println(slice.ToAnySlice(a)...)
	})
	log.Println("http listened ", addr)
	err := http.ListenAndServe(addr, nil)
	if err != nil {
		panic(err)
	}
}

func execCMD(cmd string, args ...string) []byte {
	cm := exec.Command(cmd, args...)
	output, err := cm.CombinedOutput()
	if err != nil {
		log.Println(err)
	}
	return output
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
