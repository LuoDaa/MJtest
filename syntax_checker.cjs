const fs = require('fs');

try {
  const content = fs.readFileSync('./src/utils/fortune_optimized.js', 'utf8');
  // 尝试包装在一个函数中来检查语法
  new Function(content);
  console.log('Syntax OK');
} catch (e) {
  console.log('Syntax Error:', e.message);
  console.log('Position might be around character:', e.stack);
}