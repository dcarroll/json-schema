
import * as schema from "./testing/com_sforce_soap__2006__04_metadata.json";
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'https';
import * as util from 'util';
import * as Promise from 'bluebird';

const url = "https://s3-us-west-2.amazonaws.com/djcarroll/schemas/modedSchema/";
const { execSync } = require('child_process');

const getFile = function(url: string, destination_path: string): Promise<any> {
    
    return new Promise((resolve) => {
        
        if (!fs.existsSync(destination_path)) {
            fs.mkdirSync(destination_path);
        }
        var file = fs.createWriteStream(path.join(destination_path, 'wsdl.xml'));
        var request = http.get(
            url,
            function(response) {
                response.pipe(file);
                resolve(destination_path);
            }
        );
    });
}
getFile(
    "https://dipsy-dev-ed.my.salesforce.com?ec=302&startURL=%2Fservices%2Fwsdl%2Fmetadata",
    "wsdlDownload")
    .then((path) => { console.log("done") });