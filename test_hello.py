import io
import contextlib
import unittest

import hello


class HelloTest(unittest.TestCase):
    def test_output(self):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            hello.main()
        self.assertEqual(buf.getvalue(), "Hello\n你好\n")


if __name__ == "__main__":
    unittest.main()
