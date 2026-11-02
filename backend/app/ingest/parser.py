"""Read CSV / XLSX into (headers, row iterator). Streams so 1 lakh rows stay cheap."""
import csv
import io
from collections.abc import Iterator

from openpyxl import load_workbook


class FileError(ValueError):
    pass


def _sniff_csv(data: bytes) -> tuple[list[str], Iterator[list[str]]]:
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = data.decode("latin-1")
    first = text.split("\n", 1)[0]
    delim = max([",", ";", "\t", "|"], key=first.count)
    reader = csv.reader(io.StringIO(text, newline=""), delimiter=delim)
    try:
        headers = [h.strip() for h in next(reader)]
    except StopIteration:
        raise FileError("The file is empty")
    return headers, reader


def _xlsx(data: bytes) -> tuple[list[str], Iterator[list[object]]]:
    try:
        wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    except Exception as exc:  # corrupt / not an xlsx
        raise FileError("Could not read the Excel file") from exc
    rows = wb.active.iter_rows(values_only=True)
    try:
        headers = ["" if h is None else str(h).strip() for h in next(rows)]
    except StopIteration:
        raise FileError("The file is empty")
    return headers, (list(r) for r in rows)


def read_table(file_name: str, data: bytes) -> tuple[list[str], Iterator[dict[str, object]]]:
    """Return (headers, iterator of {header: value}). Blank rows are skipped."""
    name = file_name.lower()
    if name.endswith(".xlsx"):
        headers, rows = _xlsx(data)
    elif name.endswith((".csv", ".txt")):
        headers, rows = _sniff_csv(data)
    else:
        raise FileError("Only .csv and .xlsx files are supported")
    if not any(headers):
        raise FileError("The first row must contain column headers")
    if len(set(headers)) != len(headers):
        raise FileError("Duplicate column headers in the file")

    def gen() -> Iterator[dict[str, object]]:
        for row in rows:
            if row is None or not any(str(c).strip() for c in row if c is not None):
                continue
            padded = list(row) + [None] * (len(headers) - len(row))
            yield {h: (None if v == "" else v) for h, v in zip(headers, padded)}

    return headers, gen()
