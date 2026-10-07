const fs = require('fs');
const path = require('path');

const dir = './src/pages/presentation/sales';

function walk(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function(name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile()) {
            callback(filePath, stat);
        } else if (stat.isDirectory()) {
            walk(filePath, callback);
        }
    });
}

walk(dir, function(filePath, stat) {
    if (filePath.endsWith('Modal.tsx')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = content;
        
        // Replace table-light with table-secondary
        modified = modified.replace(/table-light/g, 'table-secondary');
        
        // Also check bg-white
        modified = modified.replace(/bg-white/g, 'bg-body');
        
        if (content !== modified) {
            fs.writeFileSync(filePath, modified);
            console.log('Fixed tables', filePath);
        }
    }
});
