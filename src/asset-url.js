export function assetURL(path){const version=location.pathname.match(/^\/__hot\/([a-f0-9]{20})\//)?.[1];return (version?'/__hot/'+version:'')+path;}
