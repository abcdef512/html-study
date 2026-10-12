import {mkdirSync,copyFileSync} from 'node:fs';
mkdirSync('public',{recursive:true});
copyFileSync('SSAFY_Front_32_Mock_Exam.html','public/demo-exam.html');
