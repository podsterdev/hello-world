#!/usr/bin/env python3
"""Hello world app: prints a greeting in English and Chinese (Mandarin)."""

GREETINGS = [
    ("English", "Hello"),
    ("Chinese (Mandarin)", "你好"),
]


def main() -> None:
    for _language, greeting in GREETINGS:
        print(greeting)


if __name__ == "__main__":
    main()
