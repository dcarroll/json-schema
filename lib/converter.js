"use strict";
const path = require('path');
const parser = require('xml2json');
const fs = require('fs');
const vscode = require('vscode');
function run() {
    if (process.argv[3] === "save") {
        toXml(process.argv[2]);
    }
    else {
        toJson(process.argv[2]);
    }
}
function getSourcePath() {
    var wsRoot = vscode.workspace.workspaceFolders[0];
    var dxProj = require("./sfdx-project.json");
    for (var x = 0; x < dxProj.packageDirectories.len; x++) {
        if (x.default === true) {
            return path.join(wsRoot, x.path);
        }
    }
    return wsRoot;
}
function toJson(file) {
    var sourcePath = getSourcePath();
    var filepath = path.dirname(file);
    console.log(file + "\n\n");
    var xmlFile = path.basename(file);
    var xml = fs.readFileSync(path.join("mdsource", xmlFile)).toString();
    var json = JSON.parse(parser.toJson(xml, { reversible: false }));
    var jsonFile = xmlFile.replace("meta.xml", "meta.json");
    json = typeFixerForJson(json);
    while (path.basename(filepath) !== path.basename(sourcePath)) {
        filepath = path.basename(filepath);
    }
    fs.writeFileSync(path.join("jsonsource", jsonFile), JSON.stringify(json, null, 4));
}
function typeFixerForJson(json) {
    for (var key in json) {
        if (key === 'type') {
            json['_type'] = json[key];
            delete (json[key]);
        }
        else if (key === 'xmlns') {
            delete (json[key]);
        }
        else if (typeof json[key] === "string") {
            var parsed = parseInt(json[key]);
            if (!isNaN(parsed)) {
                json[key] = parsed;
            }
            else {
                if (json[key] == 'true') {
                    json[key] = true;
                }
                else if (json[key] == 'false') {
                    json[key] = false;
                }
            }
        }
        else {
            json[key] = typeFixer(json[key]);
        }
    }
    return json;
}
function typeFixerForXml(json) {
    for (var key in json) {
        if (key === '_type') {
            json['type'] = json[key];
            delete (json[key]);
        }
        else if (typeof json[key] === "object") {
            json[key] = typeFixerForXml(json[key]);
        }
    }
    return json;
}
function toXml(file) {
    var jsonFile = path.basename(file);
    var jsonText = fs.readFileSync(path.join("jsonsource", jsonFile)).toString();
    var json = typeFixerForXml(JSON.parse(jsonText));
    var xmlOut = '<?xml version="1.0" encoding="UTF-8"?>';
    for (var metaDataType in json) {
        var xmlns = (json[metaDataType].xmlns === undefined) ? "http://soap.sforce.com/2006/04/metadata" : json[metaDataType].xmlns;
        xmlOut += '\n<' + metaDataType + ' xmlns="' + xmlns + '">';
        for (var name in json[metaDataType]) {
            if (name !== 'xmlns') {
                xmlOut += "\n" + makeXmlTag(name, json[metaDataType][name]);
            }
        }
        xmlOut += '\n</' + metaDataType + '>';
    }
    var xmlFile = jsonFile.replace("meta.json", "meta1.xml");
    fs.writeFileSync(path.join("mdsource", xmlFile), xmlOut);
}
function makeXmlTag(name, obj) {
    if (typeof obj !== "object") {
        return "\t<" + name + ">" + obj + "</" + name + ">";
    }
    else {
        for (var objName in obj) {
            return makeXmlTag(objName, obj[objName]);
        }
    }
}
run();
