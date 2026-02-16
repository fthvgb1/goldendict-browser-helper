move current directory's all files into goldendict-ng's configure directory then it would copy contents
and pictures of dictionary.

You can also load other scripts only need change config.json

```json
{
  "dictImageMap": {
    "replace with dictionary name": "replace with fetch img selector"
  },
  "customizeResource": {
    "dictionary name": [
      "replace this item with script or css name, script or css's path is same as dictionary's folder"
    ]
  },
  "generalResource": [
    "copy.js",
    "replace this item with others script or css name, script or css's path is same as article-script( goldendict configuration folder )"
  ]
}
```