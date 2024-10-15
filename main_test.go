package main

import (
	"reflect"
	"testing"
)

func TestParseArgs(t *testing.T) {
	type args struct {
		a string
	}
	tests := []struct {
		name  string
		args  args
		wantR []string
	}{
		{
			name:  "t1",
			args:  args{"aa kkk \"s s\"  'sfskfsj'"},
			wantR: []string{"aa", "kkk", "s s", "sfskfsj"},
		},
		{
			name:  "t2",
			args:  args{`-p 127.0.0.1:9998 -a="f sfs" sfsfs 'xxff"fsf"'`},
			wantR: []string{"-p", "127.0.0.1:9998", "-a=\"f sfs\"", "sfsfs", "xxff\"fsf\""},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if gotR := parseArgs(tt.args.a); !reflect.DeepEqual(gotR, tt.wantR) {
				t.Errorf("parseArgs() = %v, want %v", gotR, tt.wantR)
			}
		})
	}
}
