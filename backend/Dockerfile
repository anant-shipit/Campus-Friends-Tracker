FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /campus-tracker .

FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app
COPY --from=builder /campus-tracker .
COPY --from=builder /app/data ./data

EXPOSE 8080

ENTRYPOINT ["./campus-tracker"]
