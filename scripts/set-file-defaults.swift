import AppKit
import CoreServices
import UniformTypeIdentifiers

let app = URL(fileURLWithPath: "/Applications/Harness IDE.app")
let bundleID = "local.harness.ide"
func check(_ condition: Bool, _ message: String) {
    if !condition {
        fputs(message + "\n", stderr)
        exit(1)
    }
}
check(Bundle(url: app)?.bundleIdentifier == bundleID, "Install Harness IDE in /Applications first.")
let audit = CommandLine.arguments.contains("--check")
check(audit, "请在 Harness IDE → 设置 → 文件后缀与默认应用 中管理关联。此脚本仅保留 --check 查询模式。")
let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
let extensions = try String(contentsOf: root.appendingPathComponent("native/document-extensions.txt"), encoding: .utf8).split(whereSeparator: { $0.isWhitespace }).map(String.init)
var failures = [String]()
var types = [String: UTType]()
for ext in extensions {
    guard let type = UTType(filenameExtension: ext) else {
        failures.append("Cannot resolve .\(ext)")
        continue
    }
    types[ext] = type
}
for ext in extensions {
    guard let type = types[ext] else { continue }
    let handler = LSCopyDefaultRoleHandlerForContentType(type.identifier as CFString, .all)?.takeRetainedValue() as String?
    print(".\(ext) (\(type.identifier)) → \(handler ?? "none")")
}
check(failures.isEmpty, failures.joined(separator: "\n"))
