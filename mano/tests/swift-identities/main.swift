import Foundation
import CoreGraphics

func check(_ value: Bool, _ message: String) { if !value { fatalError(message) } }
func samples(_ id: String, _ n: Int) -> [IdentitySample] { (0..<n).map { IdentitySample(face:"\(id)-face-\($0)",photo:"\(id)-photo-\($0)",person:id) } }
let a = samples("a",4), b = samples("b",4), c = samples("c",4), all = a+b+c
let photos = Dictionary(grouping:all,by: { $0.person }).mapValues { Set($0.map(\.photo)) }
func assigned(_ values:[IdentitySample]) -> [String:String] { Dictionary(uniqueKeysWithValues:values.map { ($0.face,"same") }) }
check(!PeoplePolicy.visible(4) && PeoplePolicy.visible(5),"Five distinct photos is a presentation threshold only")
var graph = PeopleIdentityGraph()
let captured = PeoplePolicy.cycle(available:["a","b"],scope:nil)
let later = PeoplePolicy.cycle(available:["a","new"],scope:captured.ids)
check(later.ids == ["a"] && later.hasNext,"New arrivals do not extend the finite initial pass, missing resources do not block it")
check(graph.reconcile(samples:all,assignments:assigned(all),photos:photos,names:[:]) == 2,"Multiple independent representatives consolidate three fragments")
check(Set([graph.canonical("a"),graph.canonical("b"),graph.canonical("c")]).count == 1,"Old logical IDs remain valid aliases")
check(try JSONDecoder().decode(PeopleIdentityGraph.self,from:JSONEncoder().encode(graph)) == graph,"Aliases persist")

graph = PeopleIdentityGraph()
_ = graph.reconcile(samples:a+b,assignments:assigned([a[0],b[0]]),photos:photos,names:[:])
check(graph.aliases.isEmpty,"A single weak bridge never merges two groups")
graph = PeopleIdentityGraph(); graph.separate("a","b")
_ = graph.reconcile(samples:a+b,assignments:assigned(a+b),photos:photos,names:[:])
check(graph.aliases.isEmpty,"Manual splits survive global matching")
var shared = photos; shared["a"]!.insert("together"); shared["b"]!.insert("together")
graph = PeopleIdentityGraph(); _ = graph.reconcile(samples:a+b,assignments:assigned(a+b),photos:shared,names:[:])
check(graph.aliases.isEmpty,"Two different people photographed together are a cannot-link")
graph = PeopleIdentityGraph(); _ = graph.reconcile(samples:a+b,assignments:assigned(a+b),photos:photos,names:["a":"Ana","b":"Bea"])
check(graph.aliases.isEmpty,"Different manual names are not silently collapsed")
let singleton = samples("single",1)
graph = PeopleIdentityGraph(); _ = graph.reconcile(samples:a+singleton,assignments:assigned(a+singleton),photos:photos,names:[:])
check(graph.aliases.isEmpty,"Uncertain singleton is retained, not forced into a person")
let repeated = [IdentitySample(face:"x",photo:"same-photo",person:"a"),IdentitySample(face:"y",photo:"same-photo",person:"a")]
graph = PeopleIdentityGraph(); _ = graph.reconcile(samples:repeated+b,assignments:assigned(repeated+b),photos:photos,names:[:])
check(graph.aliases.isEmpty,"Evidence counts distinct photographs, not detections")

var state = PeopleState(); state.entities = ["old":"stable"]; state.names = ["stable":"My name"]
state.entries["p"] = PeopleEntry(signature:"v1",faces:[PeopleFace(id:"f",entity:"old",box:[0.1,0.1,0.2,0.3],person:"stable")])
state.assign([(photo:"p",face:PeopleFace(id:"f",entity:"new-label",box:[0.1,0.1,0.2,0.3]))])
check(state.entries["p"]!.faces[0].person == "stable" && state.names["stable"] == "My name","Framework relabel never invents a new logical person")
state.overrides["f"] = "manual"; state.names["manual"] = "Corrected"
state.assign([(photo:"p",face:PeopleFace(id:"replacement-id",entity:"another-label",box:[0.1,0.1,0.2,0.3]))])
check(state.group(state.entries["p"]!.faces[0]) == "manual" && state.overrides["replacement-id"] == "manual","Unique unchanged-photo geometry anchors preserve corrections across opaque face IDs")
graph = PeopleIdentityGraph(); graph.separate("a","b"); graph.merge("a",into:"c")
check(graph.separated("c","b"),"Cannot-link survives aliases and transitive merge candidates")
let legacy = Data(#"{"consent":true,"entries":{},"entities":{"e":"persistent"},"names":{"persistent":"Name"},"overrides":{"f":"manual"},"excluded":["excluded"],"ordinal":8}"#.utf8)
let migrated = try PeopleState.decode(legacy)
check(migrated.schema == 2 && migrated.names["persistent"] == "Name" && migrated.overrides["f"] == "manual" && migrated.excluded.contains("excluded"),"v1 migration retains corrections and IDs")
do { _ = try PeopleState.decode(Data("[]".utf8)); fatalError("Malformed store accepted") } catch { }

let bar = PeopleGeometry.eyeBar([[0.4,0.35],[0.6,0.45]],bounds:[0.25,0.2,0.5,0.6],width:1000,height:1000)!
let landmark = PeopleGeometry.landmark(CGPoint(x:0.25,y:0.8),face:CGRect(x:0.2,y:0.2,width:0.6,height:0.5),crop:CGRect(x:100,y:200,width:400,height:500),image:CGSize(width:1000,height:1000))
check(abs(landmark[0]-0.24)<0.000001 && abs(landmark[1]-0.4)<0.000001,"Vision landmarks flip Y once within face and crop, not in Media Intelligence coordinates")
check(bar.angle > 0.4 && bar.angle < 0.5,"Eye bar follows measured tilt")
check(PeopleGeometry.eyeBar(nil,bounds:[0.2,0.2,0.5,0.5],width:1000,height:1000) == nil,"No invented eye position")
for angle in [-0.7,0,0.7] {
 let oval = PeopleGeometry.oval([0.3,0.2,0.2,0.4],width:1000,height:1000,angle:angle)!
 let box = PeopleGeometry.rect([0.3,0.2,0.2,0.4],width:1000,height:1000)!
 for x in [box.minX,box.maxX] { for y in [box.minY,box.maxY] {
  let dx=x-oval.center.x,dy=y-oval.center.y,px=dx*cos(oval.angle)+dy*sin(oval.angle),py = -dx*sin(oval.angle)+dy*cos(oval.angle)
  check(pow(px/oval.radii.width,2)+pow(py/oval.radii.height,2)<=1,"Oval covers safety rectangle at every tested tilt")
 } }
}
// Single-photo identities never reach minimumMergeEvidence: skipping their crops
// cannot change a reconciliation decision for the same assignments.
let lone = samples("lone",1), pair = samples("pair",2), fragment = samples("fragment",4)
let mixed = a+fragment+lone+pair
check(Set(PeoplePolicy.reconcilable(mixed).map(\.person)) == ["a","fragment","pair"],"Only identities with two or more distinct photos are sampled")
var mixedPhotos = Dictionary(grouping:mixed,by:{ $0.person }).mapValues { Set($0.map(\.photo)) }
for assignment in [assigned(mixed), Dictionary(uniqueKeysWithValues:mixed.map { ($0.face, $0.person == "pair" ? "other" : "same") })] {
 var full = PeopleIdentityGraph(), reduced = PeopleIdentityGraph()
 let x = full.reconcile(samples:mixed,assignments:assignment,photos:mixedPhotos,names:[:])
 let y = reduced.reconcile(samples:PeoplePolicy.reconcilable(mixed),assignments:assignment,photos:mixedPhotos,names:[:])
 check(x == y && full == reduced,"Dropping single-photo samples leaves merges and aliases identical")
}
mixedPhotos["lone"] = ["lone-photo-0"]
check(PeoplePolicy.reconcilable(lone).isEmpty && PeoplePolicy.quarantineStrikes == 2,"Lone identities alone produce no reconciliation work")
print("PEOPLE_IDENTITIES_OK: conservative global evidence, cannot-links, stable IDs, migration and tilted masks; no biometric accuracy claim")
