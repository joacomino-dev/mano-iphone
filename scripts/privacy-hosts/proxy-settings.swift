// Public macOS SystemConfiguration API. Disposable hosted runner only.
import Foundation
import SystemConfiguration

func require(_ value:Bool,_ message:String) { if !value { fputs(message+"\n",stderr);exit(1) } }
let environment=ProcessInfo.processInfo.environment
require(environment["GITHUB_ACTIONS"] == "true" && environment["RUNNER_ENVIRONMENT"] == "github-hosted","Refused: hosted runner required")
require(CommandLine.arguments.count==3,"Expected apply/restore and private snapshot path")
let action=CommandLine.arguments[1],url=URL(fileURLWithPath:CommandLine.arguments[2])
let prefs=SCPreferencesCreate(nil,"CocoWash generated CI host capture" as CFString,nil)!
require(SCPreferencesLock(prefs,true),"Cannot lock proxy configuration")
defer { SCPreferencesUnlock(prefs) }
let services=SCNetworkServiceCopyAll(prefs) as? [SCNetworkService] ?? []
if action=="apply" {
    require(!FileManager.default.fileExists(atPath:url.path),"Preserve existing proxy snapshot")
    let store=SCDynamicStoreCreate(nil,"CocoWash CI" as CFString,nil,nil)!
    var saved:[[String:Any]]=[]
    for service in services where SCNetworkServiceGetEnabled(service) {
        guard let identifier=SCNetworkServiceGetServiceID(service) else { continue }
        let id=identifier as String
        guard SCDynamicStoreCopyValue(store,"State:/Network/Service/\(id)/IPv4" as CFString) != nil,
              let proto=SCNetworkServiceCopyProtocol(service,kSCNetworkProtocolTypeProxies) else { continue }
        let config=SCNetworkProtocolGetConfiguration(proto) as? [String:Any]
        saved.append(["id":id,"hadConfiguration":config != nil,"configuration":config ?? [:]])
    }
    require(!saved.isEmpty,"No active IPv4 network service")
    try PropertyListSerialization.data(fromPropertyList:saved,format:.xml,options:0).write(to:url,options:.atomic)
    try FileManager.default.setAttributes([.posixPermissions:0o600],ofItemAtPath:url.path)
    for item in saved {
        let service=services.first { SCNetworkServiceGetServiceID($0).map { $0 as String } == (item["id"] as? String) }!
        let proto=SCNetworkServiceCopyProtocol(service,kSCNetworkProtocolTypeProxies)!
        var config=item["configuration"] as! [String:Any]
        config[kSCPropNetProxiesHTTPEnable as String]=1
        config[kSCPropNetProxiesHTTPProxy as String]="127.0.0.1"
        config[kSCPropNetProxiesHTTPPort as String]=8732
        config[kSCPropNetProxiesHTTPSEnable as String]=1
        config[kSCPropNetProxiesHTTPSProxy as String]="127.0.0.1"
        config[kSCPropNetProxiesHTTPSPort as String]=8732
        require(SCNetworkProtocolSetConfiguration(proto,config as CFDictionary),"Cannot apply test proxy")
    }
} else if action=="restore" {
    let saved=try PropertyListSerialization.propertyList(from:Data(contentsOf:url),format:nil) as! [[String:Any]]
    for item in saved {
        guard let service=services.first(where:{SCNetworkServiceGetServiceID($0).map { $0 as String } == (item["id"] as? String)}),
              let proto=SCNetworkServiceCopyProtocol(service,kSCNetworkProtocolTypeProxies) else { require(false,"Cannot restore original service");continue }
        let config=item["hadConfiguration"] as? Bool == true ? item["configuration"] as? [String:Any] : nil
        require(SCNetworkProtocolSetConfiguration(proto,config.map { $0 as CFDictionary }),"Cannot restore test proxy")
    }
} else { require(false,"Unknown proxy action") }
require(SCPreferencesCommitChanges(prefs) && SCPreferencesApplyChanges(prefs),"Cannot commit proxy configuration")
print("HOST_PROXY_CONFIGURATION_\(action.uppercased())_OK")
