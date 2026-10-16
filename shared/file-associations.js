export const associationDefaults = ["txt", "text", "log", "md", "markdown", "mdown", "json", "jsonc", "jsonl", "ndjson", "yaml", "yml", "toml", "ini", "conf", "cfg", "config", "properties", "env", "setting", "settings", "xml", "xsd", "xsl", "xslt", "csv", "tsv", "js", "mjs", "cjs", "jsx", "cts", "html", "htm", "css", "scss", "sass", "less", "vue", "svelte", "py", "pyw", "sh", "bash", "zsh", "fish", "sql", "java", "c", "h", "cc", "cpp", "cxx", "hpp", "hxx", "cs", "go", "rs", "rb", "php", "swift", "kt", "kts", "dart", "lua", "pl", "r", "tex", "bib", "diff", "patch", "graphql", "gql", "dockerfile", "sshconfig"];
export const defaultAssociationApp = ext => ["html","htm"].includes(ext) ? "com.google.Chrome" : "local.harness.ide";
export function normalizeExtension(value) {
 if(typeof value!=="string")throw Error("请输入文件后缀");
 const ext=value.trim().replace(/^\./, "").toLowerCase();
 if(!/^[a-z0-9][a-z0-9_+-]{0,31}$/.test(ext))throw Error("后缀限 1–32 位字母、数字、下划线、加减号，不含路径");
 return ext;
}
