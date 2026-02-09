import fs from 'fs';

// 读取文件内容
const content = fs.readFileSync('./src/utils/fortune_optimized.js', 'utf8');
const lines = content.split('\n');

let braceCount = 0;
let bracketCount = 0;
let parenCount = 0;
let inString = false;
let stringChar = '';
let escaped = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (escaped) {
            escaped = false;
            continue;
        }
        
        if (char === '\\' && inString) {
            escaped = true;
            continue;
        }
        
        if (!inString && (char === '"' || char === "'" || char === '`')) {
            inString = true;
            stringChar = char;
            continue;
        }
        
        if (inString && char === stringChar) {
            inString = false;
            stringChar = '';
            continue;
        }
        
        if (!inString) {
            if (char === '{') braceCount++;
            else if (char === '}') braceCount--;
            else if (char === '[') bracketCount++;
            else if (char === ']') bracketCount--;
            else if (char === '(') parenCount++;
            else if (char === ')') parenCount--;
        }
    }
    
    if (braceCount < 0 || bracketCount < 0 || parenCount < 0) {
        console.log(`Balance error at line ${i + 1}: brace=${braceCount}, bracket=${bracketCount}, paren=${parenCount}`);
        console.log(`Line: ${line}`);
        break;
    }
}

console.log(`Final counts: brace=${braceCount}, bracket=${bracketCount}, paren=${parenCount}`);