import fs from 'node:fs';
const pbx='ios/App/App.xcodeproj/project.pbxproj';
let project=fs.readFileSync(pbx,'utf8');
if(!project.includes('PhotoLibrary.swift in Sources')) {
 project=project.replace('/* Begin PBXBuildFile section */','/* Begin PBXBuildFile section */\n\t\tA10000000000000000000001 /* PhotoLibrary.swift in Sources */ = {isa = PBXBuildFile; fileRef = A10000000000000000000002 /* PhotoLibrary.swift */; };');
 project=project.replace('/* Begin PBXFileReference section */','/* Begin PBXFileReference section */\n\t\tA10000000000000000000002 /* PhotoLibrary.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = PhotoLibrary.swift; sourceTree = "<group>"; };');
 project=project.replace('504EC3071FED79650016851F /* AppDelegate.swift */,','504EC3071FED79650016851F /* AppDelegate.swift */,\n\t\t\t\tA10000000000000000000002 /* PhotoLibrary.swift */,');
 project=project.replace('504EC3081FED79650016851F /* AppDelegate.swift in Sources */,','504EC3081FED79650016851F /* AppDelegate.swift in Sources */,\n\t\t\t\tA10000000000000000000001 /* PhotoLibrary.swift in Sources */,');
}
project=project.replaceAll('IPHONEOS_DEPLOYMENT_TARGET = 15.0;','IPHONEOS_DEPLOYMENT_TARGET = 17.0;').replaceAll('TARGETED_DEVICE_FAMILY = "1,2";','TARGETED_DEVICE_FAMILY = 1;');
if(!project.includes('PrivacyInfo.xcprivacy in Resources')) {
 project=project.replace('/* Begin PBXBuildFile section */','/* Begin PBXBuildFile section */\n\t\tA10000000000000000000003 /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = A10000000000000000000004 /* PrivacyInfo.xcprivacy */; };');
 project=project.replace('/* Begin PBXFileReference section */','/* Begin PBXFileReference section */\n\t\tA10000000000000000000004 /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };');
 project=project.replace('504EC3131FED79650016851F /* Info.plist */,','504EC3131FED79650016851F /* Info.plist */,\n\t\t\t\tA10000000000000000000004 /* PrivacyInfo.xcprivacy */,');
 project=project.replace('50379B232058CBB4000EE86E /* capacitor.config.json in Resources */,','50379B232058CBB4000EE86E /* capacitor.config.json in Resources */,\n\t\t\t\tA10000000000000000000003 /* PrivacyInfo.xcprivacy in Resources */,');
}
fs.writeFileSync(pbx,project);
const main='ios/App/App/Base.lproj/Main.storyboard';
fs.writeFileSync(main,fs.readFileSync(main,'utf8').replace('customClass="CAPBridgeViewController" customModule="Capacitor"','customClass="ManoBridgeController" customModule="App" customModuleProvider="target"'));
const plist='ios/App/App/Info.plist'; let info=fs.readFileSync(plist,'utf8');
if(!info.includes('NSPhotoLibraryUsageDescription'))info=info.replace('<key>LSRequiresIPhoneOS</key>','<key>NSPhotoLibraryUsageDescription</key>\n<string>Mano necesita leer tu carrete para comparar fotos y vídeos, marcar favoritos, organizar álbumes y borrar solo los descartes que confirmes. El análisis se realiza en tu iPhone.</string>\n<key>NSPhotoLibraryAddUsageDescription</key>\n<string>Mano organiza las fotos que eliges en tus álbumes de Fotos.</string>\n<key>LSRequiresIPhoneOS</key>');
info=info.replace('<string>en</string>','<string>es</string>');
// Landscape is intentionally unsupported for the card-hand UI in this first build.
info=info.replace(/\s*<string>UIInterfaceOrientationLandscapeLeft<\/string>/g,'').replace(/\s*<string>UIInterfaceOrientationLandscapeRight<\/string>/g,'');
fs.writeFileSync(plist,info);
console.log('PhotoLibrary plugin, Spanish privacy strings and iPhone target configured.');
