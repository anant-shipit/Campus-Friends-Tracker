package data

import "embed"

//go:embed data.json subjects.json
var EmbeddedData embed.FS
