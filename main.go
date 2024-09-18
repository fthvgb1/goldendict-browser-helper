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
	"strconv"
	"strings"
	"sync"
	"time"
)

var addr string
var mux = sync.Mutex{}
var timeout time.Duration

func main() {
	flag.StringVar(&addr, "p", ":9999", "httpserver listen port")
	flag.DurationVar(&timeout, "t", 10*time.Second, "ocr watch timeout")
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

	http.HandleFunc("/ocr", func(w http.ResponseWriter, r *http.Request) {
		err := r.ParseForm()
		if err != nil {
			log.Println(err)
			return
		}
		copyKeys, err := parseKeyboard(r, "ocr")
		if err != nil {
			log.Println(err)
			return
		}
		ocr, err := parseKeyboard(r, "copy")
		if err != nil {
			log.Println(err)
			return
		}
		err = tapKeyboard(copyKeys)
		if err != nil {
			panic(err)
		}

		ctx, cancel := context.WithTimeout(context.TODO(), timeout)
		defer cancel()
		ch := clipboard.Watch(ctx, clipboard.FmtText)
		for {
			select {
			case <-ctx.Done():
				return
			case str := <-ch:
				if len(str) < 1 {
					return
				}
				log.Println("copied:", string(str))
				clipboard.Write(clipboard.FmtText, str)
				err = tapKeyboard(ocr)
				return
			}
		}
	})
	log.Println("http listened ", addr)
	err := http.ListenAndServe(addr, nil)
	if err != nil {
		panic(err)
	}
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
