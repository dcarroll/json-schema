"use strict"

const config = require('./config/config.json');
//const schema = require('./wsdl/javascript/com_sforce_soap__2006__04_metadata.json').definitions;
const fs = require('fs');
const path = require('path');
const url = "https://s3-us-west-2.amazonaws.com/djcarroll/schemas/modedSchema/";
const { execSync } = require('child_process');
const metadata_xsd_location = "wsdl/metadata.xsd";
const parser = require('xml2json');

function downloadFile(url, destination_path) {
    var http = require('http');

    var file = fs.createWriteStream("file.jpg");
    var request = http.get(
        "http://i3.ytimg.com/vi/J---aiyznGQ/mqdefault.jpg", 
        function(response) {
            response.pipe(file);
        }
    );
}

function fetchWsdl() {
    execSync('force login -u dcarroll@demo.com -p test1234');
}

function convertWsdlToJsJson() {
    execSync('java -jar jsonix-schema-compiler-full.jar -generateJsonSchema -d wsdl/javascript -b wdl/bindings.xjb wsdl/metadata.xsd');
}

function replaceRefs(schemaLocation) {
    if (schemaLocation.endsWith('schema')) {
        fs.copyFileSync(schemaLocation, schemaLocation.substr(0, schemaLocation.length -6));
        schemaLocation = schemaLocation.substr(0, schemaLocation.length -6);
    }
    let schema = require(schemaLocation).definitions;
    var schemaArray = JSON.stringify(schema, null,1).split('\n');
    var modedSchema = [];
    schemaArray.map(function(value) {
        if (value.indexOf('"#/definitions') > 0) {
            var refParts = value.split(": ");
            var definitionReference = refParts[1].split("/")[2].trim();

            definitionReference = url +
                definitionReference.substr(0, definitionReference.length - 1) +
                "Schema.json";
            //definitionReference = url + definitionReference + "Schema.json";
            //var newValue = refParts[0] + ': "' + definitionReference + '"';
            modedSchema.push(refParts[0] + ': "' + definitionReference + '"');
        } else {
            modedSchema.push(value);
        }
    });

    var modedJson = modedSchema.join('\n');
    return JSON.parse(modedJson);
}

function generateSchemaFiles() {
    convertWsdlToJsJson();
    var updatedSchema = replaceRefs(config.sourceSchema);

    if (!fs.existsSync(config.schemaDestination)) {
        fs.mkdir(config.schemaDestination);
    }

    for (const key in updatedSchema) {
        if (key !== 'CustomField') { // Skip custom fields
            if (updatedSchema.hasOwnProperty(key)) {
                const element = updatedSchema[key];
                var temp_schema = {
                    $schema: "http://json-schema.org/draft-04/schema#"
                };
                temp_schema.properties = {};
                temp_schema.properties[key] = element;
                fs.writeFileSync(path.join(config.schemaDestination, key + "Schema.json"), JSON.stringify(temp_schema, null, 4));
            }
        }
    };
    generateFileMatchers();
}

function generateFileMatchers() {
    mapMDDescribe();

    var md = require("./wsdl/javascript/com_sforce_soap__2006__04_metadata.js");
    var typeInfos = md.com_sforce_soap__2006__04_metadata.typeInfos;
    var mdDescribe = require('./wsdl/mddescribe_obj.json');

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
    //jsonValidation = { jsonValidation: jsonValidation }; 
    let pkgJson = require('./package.json');
    delete pkgJson.contributes.jsonValidation;
    pkgJson.contributes.jsonValidation = jsonValidation;
    fs.writeFileSync("./package.json", 
        JSON.stringify(pkgJson, null, 4));
}

function mapMDDescribe() {
    execSync('force login -u dcarroll@demo.com -p test1234');
    var rawDescribe = execSync('force describe -t metadata -j').toString();
    var rdarry = rawDescribe.split('\n');
    rdarry.shift();
    rdarry.shift();
    rdarry.pop();
    rawDescribe = rdarry.join('\n');
    var mdDesc = { mdArray: JSON.parse(rawDescribe) };
    var mdDescObj = {};
    mdDesc.mdArray.forEach(element => {
        mdDescObj[element.XmlName] = {
            ChildXmlNames: element.XmlName,
            DirectoryName: element.XmlName,
            InFolder: element.InFolder,
            MetaFile: element.MetaFile,
            Suffix: element.Suffix
        }
        console.log(element.XmlName);
    });
    fs.writeFileSync('./wsdl/mddescribe_obj.json', JSON.stringify(mdDescObj, null, 4));
}

//mapMDDescribe();
generateSchemaFiles();
//generateFileMatchers();