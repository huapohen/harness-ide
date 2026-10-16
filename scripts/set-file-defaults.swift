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
if !audit {
    check(LSRegisterURL(app as CFURL, true) == noErr, "Failed to register Harness IDE.")
}
let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
let extensions = try String(contentsOf: root.appendingPathComponent("native/document-extensions.txt"), encoding: .utf8).split(whereSeparator: { $0.isWhitespace }).map(String.init)
var pending = 0
var failures = [String]()
var types = [String: UTType]()
for ext in extensions {
    guard let type = UTType(filenameExtension: ext) else {
        failures.append("Cannot resolve .\(ext)")
        continue
    }
    types[ext] = type
}
if !audit {
    // Use the completion-based API: a successful legacy LSSet call may only enqueue the change.
    for identifier in Set(types.values.map(\.identifier)).sorted() {
        guard let type = UTType(identifier) else { continue }
        let existing = LSCopyDefaultRoleHandlerForContentType(identifier as CFString, .all)?.takeRetainedValue() as String?
        if existing == bundleID { continue }
        pending += 1
        NSWorkspace.shared.setDefaultApplication(at: app, toOpen: type) { error in
            if let error { failures.append("\(identifier): \(error.localizedDescription)") }
            pending -= 1
        }
    }
    let deadline = Date(timeIntervalSinceNow: 180)
    while pending > 0 && Date() < deadline {
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.1))
    }
    check(pending == 0, "Timed out waiting for macOS to apply associations; run --check to inspect current defaults.")
}
for ext in extensions {
    guard let type = types[ext] else { continue }
    let handler = LSCopyDefaultRoleHandlerForContentType(type.identifier as CFString, .all)?.takeRetainedValue() as String?
    print(".\(ext) (\(type.identifier)) → \(handler ?? "none")")
    if !audit && handler != bundleID { failures.append("Default application verification failed for .\(ext)") }
}
check(failures.isEmpty, failures.joined(separator: "\n"))
