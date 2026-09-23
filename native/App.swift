import Cocoa
import WebKit


final class HarnessWebView: WKWebView {
    private func fileURLs(_ sender: NSDraggingInfo) -> [URL] {
        (sender.draggingPasteboard.readObjects(forClasses: [NSURL.self], options: [.urlReadingFileURLsOnly: true]) as? [URL]) ?? []
    }
    override func draggingEntered(_ sender: NSDraggingInfo) -> NSDragOperation {
        fileURLs(sender).isEmpty ? super.draggingEntered(sender) : .copy
    }
    override func draggingUpdated(_ sender: NSDraggingInfo) -> NSDragOperation {
        fileURLs(sender).isEmpty ? super.draggingUpdated(sender) : .copy
    }
    override func prepareForDragOperation(_ sender: NSDraggingInfo) -> Bool {
        fileURLs(sender).isEmpty ? super.prepareForDragOperation(sender) : true
    }
    override func performDragOperation(_ sender: NSDraggingInfo) -> Bool {
        let urls = fileURLs(sender)
        if urls.isEmpty { return super.performDragOperation(sender) }
        let p = convert(sender.draggingLocation, from: nil)
        let x = p.x / pageZoom, y = (isFlipped ? p.y : bounds.height - p.y) / pageZoom
        guard let data = try? JSONSerialization.data(withJSONObject: [urls.map { $0.path }, x, y]), let json = String(data: data, encoding: .utf8) else { return false }
        evaluateJavaScript("window.harnessDropFiles?.(...\(json))")
        return true
    }
    override var safeAreaInsets: NSEdgeInsets { NSEdgeInsets(top: 0, left: 0, bottom: 0, right: 0) }
}

@objc(HarnessApplication)
final class HarnessApplication: NSApplication {
    weak var shortcutWeb: WKWebView?
    var shortcutKeys = Set<String>()
    override func sendEvent(_ event: NSEvent) {
        if event.type == .leftMouseDown, event.clickCount == 2, let web = shortcutWeb, let window = web.window, event.window === window, event.locationInWindow.y >= window.frame.height - 35, event.locationInWindow.x > 80 {
            window.zoom(nil); return
        }
        guard event.type == .keyDown, let web = shortcutWeb, event.window === web.window else { super.sendEvent(event); return }
        let codes: [UInt16:String] = [0:"a",1:"s",2:"d",3:"f",4:"h",5:"g",6:"z",7:"x",8:"c",9:"v",11:"b",12:"q",13:"w",14:"e",15:"r",16:"y",17:"t",18:"1",19:"2",20:"3",21:"4",22:"6",23:"5",24:"=",25:"9",26:"7",27:"-",28:"8",29:"0",30:"]",31:"o",32:"u",33:"[",34:"i",35:"p",36:"enter",37:"l",38:"j",39:"'",40:"k",41:";",42:"\\",43:",",44:"/",45:"n",46:"m",47:".",48:"tab",49:"space",50:"`",51:"backspace",53:"escape",115:"home",116:"pageup",117:"delete",119:"end",121:"pagedown",123:"left",124:"right",125:"down",126:"up",122:"f1",120:"f2",99:"f3",118:"f4",96:"f5",97:"f6",98:"f7",100:"f8",101:"f9",109:"f10",103:"f11",111:"f12"]
        guard let key = codes[event.keyCode] ?? event.charactersIgnoringModifiers?.lowercased() else { super.sendEvent(event); return }
        let f = event.modifierFlags
        let stroke = [(f.contains(.command) ? "cmd" : nil), (f.contains(.control) ? "ctrl" : nil), (f.contains(.option) ? "alt" : nil), (f.contains(.shift) ? "shift" : nil), key].compactMap { $0 }.joined(separator: "+")
        guard shortcutKeys.contains(stroke) else { super.sendEvent(event); return }
        let data = try! JSONSerialization.data(withJSONObject: [stroke])
        let json = String(data: data, encoding: .utf8)!
        web.evaluateJavaScript("window.harnessDispatchShortcut?.(\(json)[0]) || false") { handled, _ in
            if handled as? Bool != true { self.deliverNormally(event) }
        }
    }
    private func deliverNormally(_ event: NSEvent) { super.sendEvent(event) }
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKUIDelegate, WKNavigationDelegate, NSWindowDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var web: WKWebView!
    var child: Process?
    var recentMenu: NSMenu!
    var autoSaveItem: NSMenuItem!
    func applicationDidFinishLaunching(_ notification: Notification) {
        let menu = NSMenu()
        let appItem = NSMenuItem(); menu.addItem(appItem)
        let appMenu = NSMenu(); appItem.submenu = appMenu
        appMenu.addItem(withTitle: "Quit Harness IDE", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        let fileItem = NSMenuItem(); fileItem.title = "File"; menu.addItem(fileItem)
        let fileMenu = NSMenu(title: "File"); fileItem.submenu = fileMenu
        for (title, command, key) in [("New Text File", "file.newText", "n"), ("New File…", "file.new", ""), ("", "", ""), ("Open…", "file.openDialog", "o"), ("Open Folder…", "file.openFolderDialog", "")] {
            if title.isEmpty { fileMenu.addItem(.separator()); continue }
            let item = NSMenuItem(title: title, action: #selector(fileCommand(_:)), keyEquivalent: key); item.target = self; item.representedObject = command; fileMenu.addItem(item)
        }
        let recent = NSMenuItem(title: "Open Recent", action: nil, keyEquivalent: ""); recentMenu = NSMenu(title: "Open Recent"); recent.submenu = recentMenu; fileMenu.addItem(recent); updateRecentMenu()
        fileMenu.addItem(.separator())
        for (title, command, key) in [("Save", "files.save", "s"), ("Save As…", "files.saveAs", ""), ("Save All", "files.saveAll", "S")] {
            let item = NSMenuItem(title: title, action: #selector(fileCommand(_:)), keyEquivalent: key); item.target = self; item.representedObject = command; fileMenu.addItem(item)
        }
        fileMenu.addItem(.separator())
        autoSaveItem = NSMenuItem(title: "Auto Save", action: #selector(fileCommand(_:)), keyEquivalent: ""); autoSaveItem.target = self; autoSaveItem.representedObject = "files.autoSave"; fileMenu.addItem(autoSaveItem)
        let editItem = NSMenuItem(); editItem.title = "Edit"; menu.addItem(editItem)
        let edit = NSMenu(title: "Edit"); editItem.submenu = edit
        for (title, selector, key) in [("Undo", "undo:", "z"), ("Redo", "redo:", "Z"), ("Cut", "cut:", "x"), ("Copy", "copy:", "c"), ("Paste", "paste:", "v"), ("Select All", "selectAll:", "a")] {
            edit.addItem(withTitle: title, action: Selector(selector), keyEquivalent: key)
        }
        let viewItem = NSMenuItem(); viewItem.title = "View"; menu.addItem(viewItem)
        let viewMenu = NSMenu(title: "View"); viewItem.submenu = viewMenu
        for (title, command) in [("Toggle Activity Bar", "view.activity"), ("Toggle Side Bar", "view.sidebar"), ("Toggle Status Bar", "view.status"), ("Toggle Title Bar", "view.titlebar"), ("Toggle Secondary Side Bar", "view.secondary"), ("Toggle Terminal", "terminal.dock")] {
            let item = NSMenuItem(title: title, action: #selector(fileCommand(_:)), keyEquivalent: ""); item.target = self; item.representedObject = command; viewMenu.addItem(item)
        }
        NSApplication.shared.mainMenu = menu
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1280, height: 850), styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView], backing: .buffered, defer: false)
        window.titleVisibility = .hidden; window.titlebarAppearsTransparent = true; window.backgroundColor = NSColor(calibratedRed: 0.157, green: 0.173, blue: 0.204, alpha: 1); window.appearance = NSAppearance(named: .darkAqua)
        window.delegate = self; window.title = "Harness IDE"; window.minSize = NSSize(width: 800, height: 560)
        let configuration = WKWebViewConfiguration()
        configuration.userContentController.add(self, name: "nativeFiles")
        configuration.userContentController.add(self, name: "windowChrome")
        configuration.userContentController.add(self, name: "shortcuts")
        configuration.userContentController.add(self, name: "clipboard")
        web = HarnessWebView(frame: .zero, configuration: configuration); web.registerForDraggedTypes([.fileURL]); web.uiDelegate = self; web.navigationDelegate = self
        (NSApplication.shared as? HarnessApplication)?.shortcutWeb = web
        window.contentView = web
        if !window.setFrameUsingName("HarnessMainWindow") { window.center() }
        window.setFrameAutosaveName("HarnessMainWindow")
        window.makeKeyAndOrderFront(nil)
        NSApplication.shared.activate(ignoringOtherApps: true)
        guard let resources = Bundle.main.resourceURL else { return }
        let root = resources.appendingPathComponent("app").path
        let node = resources.appendingPathComponent("runtime/node").path
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Harness IDE", isDirectory: true)
        let workspace = support.appendingPathComponent("example", isDirectory: true)
        do {
            try FileManager.default.createDirectory(at: support, withIntermediateDirectories: true)
            if !FileManager.default.fileExists(atPath: workspace.path) {
                try FileManager.default.copyItem(at: URL(fileURLWithPath: root).appendingPathComponent("example"), to: workspace)
            }
        } catch {
            let alert = NSAlert(); alert.messageText = "无法创建工作区"; alert.informativeText = error.localizedDescription; alert.runModal(); return
        }
        let task = Process(); task.executableURL = URL(fileURLWithPath: node)
        task.arguments = [root + "/server/index.mjs"]; task.currentDirectoryURL = URL(fileURLWithPath: root)
        var env = ProcessInfo.processInfo.environment
        env["WORKSPACE"] = workspace.path
        env.removeValue(forKey: "NODE_OPTIONS")
        env.removeValue(forKey: "NODE_PATH")
        env.removeValue(forKey: "HARNESS_TOKEN")
        env.removeValue(forKey: "PORT")
        env["HARNESS_PARENT"] = String(ProcessInfo.processInfo.processIdentifier)
        env["PATH"] = resources.appendingPathComponent("runtime").path + ":/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
        task.environment = env
        let pipe = Pipe(); task.standardOutput = pipe; task.standardError = FileHandle.standardError
        var buffer = Data()
        pipe.fileHandleForReading.readabilityHandler = { handle in
            let data = handle.availableData
            if data.isEmpty { handle.readabilityHandler = nil; return }
            buffer.append(data)
            if let text = String(data: buffer, encoding: .utf8), let line = text.split(separator: "\n").first, let url = URL(string: String(line)), url.host == "127.0.0.1" {
                handle.readabilityHandler = nil
                DispatchQueue.main.async { self.web.load(URLRequest(url: url)) }
            }
        }
        do {try task.run(); child = task} catch {let alert = NSAlert(); alert.messageText = "无法启动运行时"; alert.informativeText = error.localizedDescription; alert.runModal()}
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.host == "127.0.0.1" else { return }
        if message.name == "nativeFiles", let body = message.body as? [String:Any], let action = body["action"] as? String {
            if action == "recent", let path = body["path"] as? String { var paths = UserDefaults.standard.stringArray(forKey: "recentPaths") ?? []; paths.removeAll { $0 == path }; paths.insert(path, at: 0); UserDefaults.standard.set(Array(paths.prefix(15)), forKey: "recentPaths"); updateRecentMenu(); return }
            guard let id = body["id"] as? String else { return }
            let finish: (String?) -> Void = { path in
                if let data = try? JSONSerialization.data(withJSONObject: [id, path ?? ""]), let json = String(data: data, encoding: .utf8) { self.web.evaluateJavaScript("window.harnessFileDialogResult?.(...\(json))", completionHandler: nil) }
            }
            if action == "save" { let panel = NSSavePanel(); panel.nameFieldStringValue = body["name"] as? String ?? "file.txt"; panel.canCreateDirectories = true; panel.beginSheetModal(for: window) { response in finish(response == .OK ? panel.url?.path : nil) } }
            else if action == "open" || action == "folder" { let panel = NSOpenPanel(); panel.canChooseDirectories = action == "folder"; panel.canChooseFiles = action == "open"; panel.allowsMultipleSelection = false; panel.beginSheetModal(for: window) { response in finish(response == .OK ? panel.url?.path : nil) } }
        }
        if message.name == "windowChrome", let body = message.body as? [String:Any], let action = body["action"] as? String {
            if action == "autoSave" { autoSaveItem.state = body["enabled"] as? Bool == true ? .on : .off }
            if action == "theme" { let light = body["light"] as? Bool == true; window.appearance = NSAppearance(named: light ? .aqua : .darkAqua); window.backgroundColor = light ? .white : NSColor(calibratedRed: 0.157, green: 0.173, blue: 0.204, alpha: 1) }
            if action == "zoom" { window.zoom(nil) }
            if action == "pageZoom", let factor = body["factor"] as? Double { web.pageZoom = max(0.5, min(2.0, factor)) }
            if action == "newMenu" {
                let menu = NSMenu(title: "New")
                for (title, command) in [("terminal", "terminal.new"), ("txt", "explorer.newText"), ("md", "explorer.newMarkdown"), ("file", "explorer.newUnnamed")] {
                    let item = NSMenuItem(title: title, action: #selector(fileCommand(_:)), keyEquivalent: ""); item.target = self; item.representedObject = command; menu.addItem(item)
                }
                menu.popUp(positioning: nil, at: NSEvent.mouseLocation, in: nil)
            }
            if action == "drag", let event = NSApplication.shared.currentEvent { window.performDrag(with: event) }
            if action == "reveal", let path = body["path"] as? String { NSWorkspace.shared.activateFileViewerSelecting([URL(fileURLWithPath: path)]) }
            if action == "share", let path = body["path"] as? String { let picker = NSSharingServicePicker(items: [URL(fileURLWithPath: path)]); picker.show(relativeTo: NSRect(x: web.bounds.midX, y: web.bounds.midY, width: 1, height: 1), of: web, preferredEdge: .minY) }
        }
        if message.name == "shortcuts", let keys = message.body as? [String] {
            (NSApplication.shared as? HarnessApplication)?.shortcutKeys = Set(keys)
        }
        if message.name == "clipboard", let body = message.body as? [String:Any], let id = body["id"] as? String, let action = body["action"] as? String {
            if action == "copyPdfSelection" {
                web.evaluateJavaScript("document.activeElement?.matches('iframe[data-pdf-auto-copy]') === true") { selectedPDF, _ in
                    guard selectedPDF as? Bool == true, self.window.isKeyWindow else { return }
                    NSApp.sendAction(#selector(NSText.copy(_:)), to: nil, from: nil)
                }
                return
            }
            var value = ""
            if action == "read" { value = NSPasteboard.general.string(forType: .string) ?? "" }
            if action == "write", let text = body["text"] as? String { NSPasteboard.general.clearContents(); NSPasteboard.general.setString(text, forType: .string) }
            if let data = try? JSONSerialization.data(withJSONObject: [id,value]), let json = String(data: data, encoding: .utf8) {
                web.evaluateJavaScript("window.harnessClipboardResult?.(...\(json))", completionHandler: nil)
            }
        }
    }
    @objc func fileCommand(_ sender: NSMenuItem) {
        guard let command = sender.representedObject as? String, let data = try? JSONSerialization.data(withJSONObject: [command]), let json = String(data: data, encoding: .utf8) else { return }
        web.evaluateJavaScript("window.harnessRunCommand?.(\(json)[0])", completionHandler: nil)
    }
    func updateRecentMenu() {
        recentMenu.removeAllItems()
        for path in UserDefaults.standard.stringArray(forKey: "recentPaths") ?? [] { let item = NSMenuItem(title: path, action: #selector(openRecent(_:)), keyEquivalent: ""); item.target = self; item.representedObject = path; recentMenu.addItem(item) }
        if recentMenu.items.isEmpty { let item = NSMenuItem(title: "No Recent Items", action: nil, keyEquivalent: ""); item.isEnabled = false; recentMenu.addItem(item) }
        recentMenu.addItem(.separator()); let clear = NSMenuItem(title: "Clear Recently Opened", action: #selector(clearRecent), keyEquivalent: ""); clear.target = self; recentMenu.addItem(clear)
    }
    @objc func openRecent(_ sender: NSMenuItem) {
        guard let path = sender.representedObject as? String else { return }; var directory: ObjCBool = false
        FileManager.default.fileExists(atPath: path, isDirectory: &directory)
        if let data = try? JSONSerialization.data(withJSONObject: [path, directory.boolValue]), let json = String(data: data, encoding: .utf8) { web.evaluateJavaScript("window.harnessOpenPath?.(...\(json))", completionHandler: nil) }
    }
    @objc func clearRecent() { UserDefaults.standard.removeObject(forKey: "recentPaths"); updateRecentMenu() }
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        web.callAsyncJavaScript("return window.harnessRequestQuit ? await window.harnessRequestQuit() : true", arguments: [:], in: nil, in: .page, completionHandler: { result in
            switch result {
            case .success(let value): sender.reply(toApplicationShouldTerminate: value as? Bool == true)
            case .failure: sender.reply(toApplicationShouldTerminate: false)
            }
        })
        return .terminateLater
    }
    func windowShouldClose(_ sender: NSWindow) -> Bool { NSApplication.shared.terminate(nil); return false }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationWillTerminate(_ notification: Notification) { child?.terminate() }
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = NSAlert(); alert.messageText = message; alert.runModal(); completionHandler()
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert(); alert.messageText = message; alert.addButton(withTitle: "继续"); alert.addButton(withTitle: "取消"); completionHandler(alert.runModal() == .alertFirstButtonReturn)
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.targetFrame?.isMainFrame == true, let host = navigationAction.request.url?.host, host != "127.0.0.1" {decisionHandler(.cancel)} else {decisionHandler(.allow)}
    }
}
let app = HarnessApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
