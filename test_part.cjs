// 创建一个测试文件，只包含 MAHJONG_HINTS 及其前面的部分
const fs = require('fs');

// 读取原始文件
const original = fs.readFileSync('./src/utils/fortune_optimized.js', 'utf8');
const lines = original.split('\n');

// 找到 MAHJONG_HINTS 定义的位置
let startLine = -1;
let endLine = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const MAHJONG_HINTS = {')) {
    startLine = i;
  }
  if (startLine !== -1 && lines[i].trim() === '};' && i > startLine + 10) {
    // 找到第一个完整的对象结束
    let openBraces = 0;
    let tempBraces = 0;
    
    // 检查从 startLine 到当前行的括号平衡
    for (let j = startLine; j <= i; j++) {
      const line = lines[j];
      for (let k = 0; k < line.length; k++) {
        const char = line[k];
        if (char === '{') tempBraces++;
        else if (char === '}') tempBraces--;
      }
    }
    
    if (tempBraces === 0) {
      endLine = i;
      break;
    }
  }
}

console.log(`MAHJONG_HINTS starts at line ${startLine + 1}, ends at line ${endLine + 1}`);

// 提取 MAHJONG_HINTS 定义部分
const mahjongHintsBlock = lines.slice(startLine, endLine + 1).join('\n');
const testCode = `
const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const ZODIAC = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];

${mahjongHintsBlock}

// Test usage
console.log('MAHJONG_HINTS structure is valid');
`;

fs.writeFileSync('test_mahjong_hints.js', testCode);

try {
  new Function(testCode);
  console.log('MAHJONG_HINTS syntax is OK');
} catch (e) {
  console.log('MAHJONG_HINTS syntax error:', e.message);
}