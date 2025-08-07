import uvicorn


def main():
    uvicorn.run("youtube_summarizer.api:app", host="0.0.0.0", port=8008, reload=False)


if __name__ == "__main__":
    main()
