package executecmd

import (
	"bytes"
	"fmt"
	"github.com/fthvgb1/wp-go/helper"
	"github.com/fthvgb1/wp-go/helper/number"
	"github.com/fthvgb1/wp-go/helper/slice"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

func PipeExecCMDs(cmds []string, res bool, args map[string][]string) (string, []byte, error) {
	var b bytes.Buffer
	var commands []*exec.Cmd
	arg := slice.ToMap(number.Range(0, len(cmds), 1), func(v int) (int, []string) {
		return v, args[number.IntToString(v)]
	}, true)
	j := 0
	cmdStr := strings.Join(slice.Map(cmds, func(t string) string {
		c := fmt.Sprintf("%s %s", t, strings.Join(arg[j], " "))
		j++
		return c
	}), "|")
	last := exec.Command(cmds[0], arg[0]...)
	commands = append(commands, last)
	for i, cmd := range cmds[1:] {
		i++
		if cmd == "" {
			continue
		}
		cm := exec.Command(cmd, arg[i]...)
		commands = append(commands, cm)
		out, err := last.StdoutPipe()
		if err != nil {
			return cmdStr, nil, err
		}
		cm.Stdin = out
		if i == len(cmds)-1 {
			cm.Stdout = &b
			cm.Stderr = &b
		}
		last = cm
	}
	var err error
	for _, command := range commands {
		err = command.Start()
		if err != nil {
			return cmdStr, nil, err
		}
	}
	for i, command := range commands {
		err = command.Wait()
		if err != nil {
			return cmdStr, nil, err
		}
		if i == len(commands)-1 && !res {
			go func() {
				err = command.Wait()
				if err != nil {
					log.Println(err)
				}
			}()
			return cmdStr, nil, nil
		}
	}
	return cmdStr, b.Bytes(), err
}

func ExecCMD(cmd string, res bool, fn func(), args ...string) ([]byte, error) {
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
		if fn != nil {
			fn()
		}
	}()
	return nil, nil
}

func ShellCmd(cmd string, res bool, args []string) ([]byte, error) {
	ex, err := os.Executable()
	if err != nil {
		return nil, err
	}
	dir := helper.Defaults(os.Getenv("shPath"), filepath.Dir(ex))
	sh := filepath.Join(dir, fmt.Sprintf("tmp%d.sh", time.Now().UnixNano()))
	file, err := os.OpenFile(sh, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0766)
	if err != nil {
		return nil, err
	}
	header := helper.Defaults(os.Getenv("shHeader"), "#!/usr/bin/env bash")
	cmd = fmt.Sprintf("%s\n%s", header, cmd)
	_, err = file.WriteString(cmd)
	if err != nil {
		return nil, err
	}
	err = file.Close()
	if err != nil {
		return nil, err
	}
	var def func()
	fn := func() {
		err = os.Remove(sh)
		if err != nil {
			log.Println(err)
		}
	}
	if !res {
		def = fn
	} else {
		defer fn()
	}
	return ExecCMD(sh, res, def, args...)
}

func ParseArgs(a string) (r []string) {
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
