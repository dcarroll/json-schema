"use strict"

const schema = require('./md-schema.json').properties;
const fs = require('fs');
const path = require('path');
const url = "https://s3-us-west-2.amazonaws.com/djcarroll/schemas/modedSchema/";

function replaceRefs() {
    var schemaString = JSON.stringify(schema, null,1);
    var schemaArray = schemaString.split('\n');
    var modedSchema = [];
    schemaArray.map(function(value) {
        if (value.indexOf('"#/definitions') > 0) {
            var refParts = value.split(": ");
            var def = refParts[1].split("/")[2].trim();
            def = def.substr(0, def.length - 1);
            def = url + def + "Schema.json";
            var newValue = refParts[0] + ': "' + def + '"';
            modedSchema.push(newValue);
        } else {
            modedSchema.push(value);
        }
    });

    var modedJson = modedSchema.join('\n');
    return JSON.parse(modedJson);
}

function run() {
    var updatedSchema = replaceRefs();
    for (const key in updatedSchema) {
        if (updatedSchema.hasOwnProperty(key)) {
            const element = updatedSchema[key];
            var temp_schema = {
                $schema: "http://json-schema.org/draft-04/schema#"
            };
            temp_schema.properties = {};
            temp_schema.properties[key] = element;
            fs.writeFileSync(path.join("modedSchema", key + "Schema.json"), JSON.stringify(temp_schema, null, 4));
            //console.log(JSON.stringify(element, null, 4));
        }
    };
}

function run2() {
    //mapMDDescribe();
    //return;
    var md = require("./com_sforce_soap__2006__04_metadata.js");
    var typeInfos = md.com_sforce_soap__2006__04_metadata.typeInfos;
    var mdDescribe = require('./mddescribe_obj.json');

    var jsonValidation = [];
    for (var i = 0; i < typeInfos.length; i++) {
        var typeInfo = typeInfos[i];
        if (typeInfo.hasOwnProperty("baseTypeInfo")) {
            if (typeInfo.baseTypeInfo === '.Metadata' || 
                typeInfo.baseTypeInfo === '.MetadataWithContent') {
                    if (mdDescribe.hasOwnProperty(typeInfo.localName)) {
                        var schemaLocation = url + typeInfo.localName + "Schema.json";
                        var fileMatcher = "**/*." + mdDescribe[typeInfo.localName].Suffix + "-meta.json";
                        jsonValidation.push( { 
                            fileMatch: fileMatcher,
                            url: schemaLocation
                        });
                        console.log(schemaLocation + "\n" + fileMatcher + "\n");
                    }
                }
        }
    }
    jsonValidation = { jsonValidation: jsonValidation }; 
    fs.writeFileSync("jsonValidation_contribution.json", 
        JSON.stringify(jsonValidation, null, 4));
}

function mapMDDescribe() {
    var mdDesc = require('./mddescribe.json').mdArray;
    var mdDescObj = {};
    mdDesc.forEach(element => {
        mdDescObj[element.XmlName] = {
            ChildXmlNames: element.XmlName,
            DirectoryName: element.XmlName,
            InFolder: element.InFolder,
            MetaFile: element.MetaFile,
            Suffix: element.Suffix
        }
        console.log(element.XmlName);
    });
    fs.writeFileSync('mddescribe_obj.json', JSON.stringify(mdDescObj, null, 4));
}

run2();