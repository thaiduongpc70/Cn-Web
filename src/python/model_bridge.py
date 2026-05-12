import sys
import json
import traceback

from model_handler import make_prediction


def main():
    try:
        raw_input = sys.stdin.read()
        data = json.loads(raw_input or "{}")

        result = make_prediction(data)

        print(json.dumps(result, ensure_ascii=False))

    except Exception as e:
        error = {
            "message": str(e),
            "traceback": traceback.format_exc()
        }

        print(json.dumps(error, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()