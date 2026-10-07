const fs = require('fs');
const path = require('path');
const glob = require('glob'); // Not available? We can use recursive readdir

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
        
        // Replace text-dark with text-body-emphasis or just remove if paired with fw-bold
        modified = modified.replace(/text-dark/g, 'text-body');
        
        // Replace bg-light with bg-body-tertiary for div panels
        modified = modified.replace(/bg-light/g, 'bg-body-tertiary');
        
        // For table headers, table-light is sometimes used. Let's replace table-light with table-secondary or table-group-divider
        // Or just leave bg-body-tertiary on thead. Bootstrap 5.3 allows bg-body-tertiary on anything.
        
        if (content !== modified) {
            fs.writeFileSync(filePath, modified);
            console.log('Fixed', filePath);
        }
    }
});
