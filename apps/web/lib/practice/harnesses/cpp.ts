import type { PracticeSignature, ValueType } from "@/types/practice";
import { MAX_CASE_STDOUT_CHARS } from "../limits";
import { RESULT_SENTINEL, FATAL_SENTINEL } from "./protocol";

/**
 * The C++ driver.
 *
 * This is the language the whole `signature` design existed for. Python and
 * JavaScript parse JSON into native values and spread them into a call, so
 * their drivers never look at a parameter's type. C++ has neither JSON nor
 * reflection: the driver has to *declare* a typed local per parameter, convert
 * into it, and serialize a concretely typed return value. All of that is
 * generated from `signature.params` and `signature.returns` here.
 *
 * Nothing is vendored in. A JSON library for one small grammar - numbers,
 * strings, booleans, null, arrays and one flat object - would be tens of
 * thousands of lines of header for a parser that fits in about a hundred, and
 * every one of those lines would be recompiled on every submission.
 */

/**
 * How each ValueType is spelled in C++.
 *
 * `int` maps to `long long` rather than `int` deliberately: JSON has one
 * numeric type and the constraints on these problems routinely reach 1e9, so
 * a 32-bit accumulator overflows on inputs that are perfectly legal. The
 * starter code carries the same spelling, so nothing about that is a surprise
 * at the point of writing a solution.
 */
const CPP_TYPES: Record<ValueType, string> = {
  int: "long long",
  float: "double",
  bool: "bool",
  string: "std::string",
  "int[]": "std::vector<long long>",
  "float[]": "std::vector<double>",
  "bool[]": "std::vector<bool>",
  "string[]": "std::vector<std::string>",
  "int[][]": "std::vector<std::vector<long long> >",
  "string[][]": "std::vector<std::vector<std::string> >",
  void: "void",
};

export function cppType(type: ValueType): string {
  return CPP_TYPES[type] ?? "long long";
}

/** The signature line a starter stub should present for this problem. */
export function cppSignatureLine(signature: PracticeSignature, functionName: string): string {
  const params = signature.params
    .map((param) => `${cppType(param.type)} ${param.name}`)
    .join(", ");
  return `${cppType(signature.returns)} ${functionName}(${params})`;
}

export function buildCppProgram(
  userCode: string,
  functionName: string,
  signature: PracticeSignature,
): string {
  const locals = signature.params
    .map(
      (param, index) =>
        `      ${cppType(param.type)} a${index} = nsd::argAt<${cppType(param.type)}>(args, ${index});`,
    )
    .join("\n");

  const callArgs = signature.params.map((_, index) => `a${index}`).join(", ");

  // A void function has no value to serialize, so the call is a statement and
  // the record carries JSON null.
  const invoke =
    signature.returns === "void"
      ? `      ${functionName}(${callArgs});
      elapsedMs = nsd::since(started);
      captured = capture.end();
      valueJson = "null";`
      : `      ${cppType(signature.returns)} returned = ${functionName}(${callArgs});
      elapsedMs = nsd::since(started);
      captured = capture.end();
      valueJson = nsd::dump(returned);`;

  // `#line` resets the compiler's idea of where it is, so a diagnostic in the
  // submitted code is reported at that code's own line number under its own
  // file name. Without it every error cites a line a few hundred down - the
  // offset introduced by the headers and the JSON layer above - which is
  // useless in the one language here where compile errors are the common case.
  //
  // It is also why the JSON layer sits *below* the solution rather than above:
  // only the includes have to precede user code, so keeping everything else
  // after it means the driver's own lines can never be confused for theirs.
  return [
    INCLUDES,
    "",
    `#line 1 "solution.cpp"`,
    userCode,
    "",
    `#line 1 "nandscape-driver"`,
    SUPPORT,
    "",
    driverBody({
      locals,
      invoke,
      resultSentinel: RESULT_SENTINEL,
      fatalSentinel: FATAL_SENTINEL,
      maxOut: MAX_CASE_STDOUT_CHARS,
    }),
  ].join("\n");
}

/**
 * The only part that has to precede the submitted code, so their solution can
 * use the standard containers without writing its own includes - which is what
 * every starter on every judge assumes.
 */
const INCLUDES = String.raw`#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <deque>
#include <iostream>
#include <iterator>
#include <limits>
#include <map>
#include <numeric>
#include <queue>
#include <set>
#include <sstream>
#include <stack>
#include <string>
#include <unordered_map>
#include <typeinfo>
#include <unordered_set>
#include <utility>
#include <vector>
#include <unistd.h>
`;

/**
 * The JSON layer, the output capture and the timing helper. Emitted *below*
 * the submitted code so nothing here shifts its line numbers.
 */
const SUPPORT = String.raw`namespace nsd {

inline void appendUtf8(std::string& out, unsigned int code) {
  if (code < 0x80u) {
    out.push_back(static_cast<char>(code));
  } else if (code < 0x800u) {
    out.push_back(static_cast<char>(0xC0u | (code >> 6)));
    out.push_back(static_cast<char>(0x80u | (code & 0x3Fu)));
  } else {
    out.push_back(static_cast<char>(0xE0u | (code >> 12)));
    out.push_back(static_cast<char>(0x80u | ((code >> 6) & 0x3Fu)));
    out.push_back(static_cast<char>(0x80u | (code & 0x3Fu)));
  }
}

struct Val {
  enum Kind { Null, Bool, Num, Str, Arr, Obj };
  Kind kind;
  bool boolean;
  double number;
  std::string text;
  std::vector<Val> items;
  std::vector<std::string> keys;

  Val() : kind(Null), boolean(false), number(0) {}

  const Val* find(const std::string& key) const {
    for (std::size_t i = 0; i < keys.size() && i < items.size(); ++i) {
      if (keys[i] == key) return &items[i];
    }
    return 0;
  }
};

/**
 * Just enough JSON for the driver protocol. Tolerant rather than strict: the
 * only producer is the server, so effort spent rejecting malformed input would
 * buy nothing a bug in that server would not already have caused.
 */
class Parser {
 public:
  explicit Parser(const std::string& source) : s(source), i(0) {}
  Val parse() { return readValue(); }

 private:
  const std::string& s;
  std::size_t i;

  void skip() {
    while (i < s.size() && (s[i] == ' ' || s[i] == '\t' || s[i] == '\n' || s[i] == '\r')) ++i;
  }

  Val readValue() {
    skip();
    if (i >= s.size()) return Val();
    char c = s[i];
    if (c == '{') return readObject();
    if (c == '[') return readArray();
    if (c == '"') {
      Val v;
      v.kind = Val::Str;
      v.text = readString();
      return v;
    }
    if (c == 't') { i += 4; Val v; v.kind = Val::Bool; v.boolean = true; return v; }
    if (c == 'f') { i += 5; Val v; v.kind = Val::Bool; v.boolean = false; return v; }
    if (c == 'n') { i += 4; return Val(); }
    return readNumber();
  }

  Val readNumber() {
    std::size_t start = i;
    while (i < s.size()) {
      char c = s[i];
      bool part = (c >= '0' && c <= '9') || c == '-' || c == '+' || c == '.' || c == 'e' || c == 'E';
      if (!part) break;
      ++i;
    }
    Val v;
    v.kind = Val::Num;
    v.number = std::strtod(s.substr(start, i - start).c_str(), 0);
    return v;
  }

  std::string readString() {
    std::string out;
    if (i < s.size() && s[i] == '"') ++i;
    while (i < s.size() && s[i] != '"') {
      char c = s[i++];
      if (c != '\\') { out.push_back(c); continue; }
      if (i >= s.size()) break;
      char esc = s[i++];
      switch (esc) {
        case 'n': out.push_back('\n'); break;
        case 't': out.push_back('\t'); break;
        case 'r': out.push_back('\r'); break;
        case 'b': out.push_back('\b'); break;
        case 'f': out.push_back('\f'); break;
        case 'u': {
          unsigned int code = 0;
          for (int k = 0; k < 4 && i < s.size(); ++k) {
            char h = s[i++];
            unsigned int digit = 0;
            if (h >= '0' && h <= '9') digit = static_cast<unsigned int>(h - '0');
            else digit = static_cast<unsigned int>((h | 32) - 'a' + 10);
            code = code * 16u + digit;
          }
          appendUtf8(out, code);
          break;
        }
        default: out.push_back(esc);
      }
    }
    if (i < s.size()) ++i;
    return out;
  }

  Val readObject() {
    Val v;
    v.kind = Val::Obj;
    ++i;
    skip();
    if (i < s.size() && s[i] == '}') { ++i; return v; }
    while (i < s.size()) {
      skip();
      v.keys.push_back(readString());
      skip();
      if (i < s.size() && s[i] == ':') ++i;
      v.items.push_back(readValue());
      skip();
      if (i < s.size() && s[i] == ',') { ++i; continue; }
      if (i < s.size() && s[i] == '}') ++i;
      break;
    }
    return v;
  }

  Val readArray() {
    Val v;
    v.kind = Val::Arr;
    ++i;
    skip();
    if (i < s.size() && s[i] == ']') { ++i; return v; }
    while (i < s.size()) {
      v.items.push_back(readValue());
      skip();
      if (i < s.size() && s[i] == ',') { ++i; continue; }
      if (i < s.size() && s[i] == ']') ++i;
      break;
    }
    return v;
  }
};

// ── JSON value -> typed C++ local ────────────────────────────────────────
template <class T> struct Conv;

template <> struct Conv<long long> {
  static long long from(const Val& v) { return static_cast<long long>(std::llround(v.number)); }
};
template <> struct Conv<double> {
  static double from(const Val& v) { return v.number; }
};
template <> struct Conv<bool> {
  static bool from(const Val& v) { return v.kind == Val::Bool ? v.boolean : v.number != 0; }
};
template <> struct Conv<std::string> {
  static std::string from(const Val& v) { return v.text; }
};
template <class T> struct Conv<std::vector<T> > {
  static std::vector<T> from(const Val& v) {
    std::vector<T> out;
    out.reserve(v.items.size());
    for (std::size_t k = 0; k < v.items.size(); ++k) out.push_back(Conv<T>::from(v.items[k]));
    return out;
  }
};

template <class T>
T argAt(const Val* args, std::size_t index) {
  if (args == 0 || index >= args->items.size()) return T();
  return Conv<T>::from(args->items[index]);
}

// ── typed C++ value -> JSON ──────────────────────────────────────────────
std::string dumpString(const std::string& v);
inline std::string dump(long long v);
inline std::string dump(double v);
inline std::string dump(bool v);
inline std::string dump(const std::string& v);
inline std::string dump(const std::vector<bool>& v);
template <class T> std::string dump(const std::vector<T>& v);

inline std::string dumpString(const std::string& v) {
  std::string out = "\"";
  for (std::size_t k = 0; k < v.size(); ++k) {
    unsigned char c = static_cast<unsigned char>(v[k]);
    if (c == '"') out += "\\\"";
    else if (c == '\\') out += "\\\\";
    else if (c == '\n') out += "\\n";
    else if (c == '\r') out += "\\r";
    else if (c == '\t') out += "\\t";
    else if (c < 0x20) {
      char buf[8];
      std::snprintf(buf, sizeof(buf), "\\u%04x", static_cast<unsigned int>(c));
      out += buf;
    } else {
      out.push_back(static_cast<char>(c));
    }
  }
  out += "\"";
  return out;
}

inline std::string dump(long long v) {
  char buf[32];
  std::snprintf(buf, sizeof(buf), "%lld", v);
  return std::string(buf);
}

inline std::string dump(double v) {
  // JSON has no infinity or NaN. Emitting null keeps the line parseable; the
  // grader then reports a mismatch rather than the whole batch failing to read.
  if (!(v == v) || v > 1e308 || v < -1e308) return "null";
  char buf[64];
  std::snprintf(buf, sizeof(buf), "%.17g", v);
  return std::string(buf);
}

inline std::string dump(bool v) { return v ? "true" : "false"; }

inline std::string dump(const std::string& v) { return dumpString(v); }

/**
 * std::vector<bool> is a bit-packed specialisation whose operator[] hands back
 * a proxy rather than a bool, and that proxy makes the generic overload below
 * ambiguous. Naming the case explicitly is the whole fix.
 */
inline std::string dump(const std::vector<bool>& v) {
  std::string out = "[";
  for (std::size_t k = 0; k < v.size(); ++k) {
    if (k) out += ",";
    out += dump(static_cast<bool>(v[k]));
  }
  out += "]";
  return out;
}

template <class T> std::string dump(const std::vector<T>& v) {
  std::string out = "[";
  for (std::size_t k = 0; k < v.size(); ++k) {
    if (k) out += ",";
    out += dump(v[k]);
  }
  out += "]";
  return out;
}

// ── per-case stdout capture ──────────────────────────────────────────────
/**
 * Redirects file descriptor 1 into a temporary file for the duration of one
 * call, at the descriptor level rather than by swapping std::cout's streambuf.
 * Both matter: a streambuf swap catches std::cout but misses printf, and
 * plenty of solutions in this language debug with printf.
 */
class Capture {
 public:
  Capture() : saved(-1), tmp(0) {}

  void begin() {
    std::cout.flush();
    std::fflush(stdout);
    saved = dup(fileno(stdout));
    tmp = std::tmpfile();
    if (tmp != 0) dup2(fileno(tmp), fileno(stdout));
  }

  std::string end() {
    if (saved < 0 && tmp == 0) return std::string();
    std::cout.flush();
    std::fflush(stdout);
    std::string out;
    if (tmp != 0) {
      long size = std::ftell(tmp);
      std::rewind(tmp);
      if (size > 0) {
        out.resize(static_cast<std::size_t>(size));
        std::size_t got = std::fread(&out[0], 1, static_cast<std::size_t>(size), tmp);
        out.resize(got);
      }
      std::fclose(tmp);
      tmp = 0;
    }
    if (saved >= 0) {
      dup2(saved, fileno(stdout));
      close(saved);
      saved = -1;
    }
    return out;
  }

 private:
  int saved;
  std::FILE* tmp;
};

inline double since(const std::chrono::steady_clock::time_point& start) {
  std::chrono::duration<double, std::milli> delta = std::chrono::steady_clock::now() - start;
  return delta.count();
}

inline void emit(const char* prefix, const std::string& body) {
  std::cout << prefix << body << "\n";
  std::cout.flush();
}

}  // namespace nsd
`;

function driverBody(options: {
  locals: string;
  invoke: string;
  resultSentinel: string;
  fatalSentinel: string;
  maxOut: number;
}): string {
  const { locals, invoke, resultSentinel, fatalSentinel, maxOut } = options;

  return String.raw`int main() {
  std::string input(
      (std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());

  nsd::Val root = nsd::Parser(input).parse();
  const nsd::Val* cases = root.find("cases");
  if (cases == 0) {
    nsd::emit("${fatalSentinel}",
              "{\"error\":" + nsd::dumpString("Could not read the test input.") + "}");
    return 0;
  }

  for (std::size_t ci = 0; ci < cases->items.size(); ++ci) {
    const nsd::Val* args = cases->items[ci].find("args");
${locals}

    bool ok = true;
    std::string error;
    std::string valueJson = "null";
    std::string captured;
    double elapsedMs = 0;

    nsd::Capture capture;
    std::chrono::steady_clock::time_point started = std::chrono::steady_clock::now();
    capture.begin();
    try {
${invoke}
    } catch (const std::exception& e) {
      elapsedMs = nsd::since(started);
      captured = capture.end();
      ok = false;
      error = std::string("Threw ") + typeid(e).name() + ": " + e.what();
    } catch (...) {
      elapsedMs = nsd::since(started);
      captured = capture.end();
      ok = false;
      error = "Threw a non-standard exception.";
    }

    char msBuf[32];
    std::snprintf(msBuf, sizeof(msBuf), "%.3f", elapsedMs);

    std::string record = "{\"i\":";
    record += nsd::dump(static_cast<long long>(ci));
    record += ",\"ms\":";
    record += msBuf;
    if (ok) {
      record += ",\"ok\":true,\"value\":";
      record += valueJson;
    } else {
      record += ",\"ok\":false,\"error\":";
      record += nsd::dumpString(error);
    }
    if (!captured.empty()) {
      if (captured.size() > ${maxOut}u) captured.resize(${maxOut}u);
      record += ",\"out\":";
      record += nsd::dumpString(captured);
    }
    record += "}";

    nsd::emit("${resultSentinel}", record);
  }

  return 0;
}
`;
}
