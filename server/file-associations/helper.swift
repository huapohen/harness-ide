import AppKit
import UniformTypeIdentifiers
import CoreServices

func appInfo(_ url: URL) -> [String: String] {
    let bundle = Bundle(url: url)
    return ["id": bundle?.bundleIdentifier ?? "", "name": (bundle?.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String) ?? url.deletingPathExtension().lastPathComponent, "path": url.path]
}
func current(_ type: UTType) -> String {
    LSCopyDefaultRoleHandlerForContentType(type.identifier as CFString, .all)?.takeRetainedValue() as String? ?? ""
}
func inspect(_ ext: String) throws -> [String: Any] {
    guard let type = UTType(filenameExtension: ext) else { throw NSError(domain:"Unknown extension",code:1) }
    let handler = current(type)
    let urls = NSWorkspace.shared.urlsForApplications(toOpen: type)
    let apps = urls.map(appInfo)
    return ["extension": ext, "type": type.identifier, "aliases": type.tags[.filenameExtension] ?? [ext], "current": handler, "apps": apps]
}
func output(_ value: Any) { let data = try! JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]); print(String(data:data,encoding:.utf8)!) }
do {
    let data = FileHandle.standardInput.readDataToEndOfFile()
    let request = try JSONSerialization.jsonObject(with:data) as! [String:Any]
    let exts = request["extensions"] as? [String] ?? []
    if request["action"] as? String == "apply" {
        guard let ext = exts.first, let type = UTType(filenameExtension:ext), let id = request["app"] as? String,
              let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier:id) else { throw NSError(domain:"应用未安装或后缀无效",code:1) }
        if let expectedType = request["expectedType"] as? String, type.identifier != expectedType { throw NSError(domain:"系统文件类型已改变，请刷新并检查共享后缀",code:1) }
        if let expected = request["expected"] as? String, current(type).lowercased() != expected.lowercased() { throw NSError(domain:"默认应用已被外部修改，请刷新后重试",code:1) }
        if current(type).lowercased() != id.lowercased() {
            var done = false
            var failure: Error?
            NSWorkspace.shared.setDefaultApplication(at:url,toOpen:type) { error in failure=error;done=true }
            let deadline=Date(timeIntervalSinceNow:120)
            while !done && Date()<deadline { RunLoop.current.run(until:Date(timeIntervalSinceNow:0.05)) }
            if !done { throw NSError(domain:"等待系统确认超时，请刷新实际关联",code:1) }
            if let failure { throw failure }
        }
        guard current(type).lowercased()==id.lowercased() else { throw NSError(domain:"系统未应用更改，请检查确认框",code:1) }
    }
    let rows = try exts.map(inspect)
    var common = [[String:String]]()
    for id in ["local.harness.ide","com.google.Chrome","com.apple.TextEdit","com.apple.Preview"] {
        if let url=NSWorkspace.shared.urlForApplication(withBundleIdentifier:id) { common.append(appInfo(url)) }
    }
    output(["rows":rows,"apps":common])
} catch { output(["error":error.localizedDescription]);exit(1) }
