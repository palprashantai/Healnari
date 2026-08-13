import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const dir = 'd:/femcare/Healnari/public/generated';

fs.readdir(dir, (err, files) => {
  if (err) throw err;
  
  files.forEach(file => {
    if (path.extname(file).toLowerCase() === '.png') {
      const inputPath = path.join(dir, file);
      const outputPath = path.join(dir, path.parse(file).name + '.webp');
      
      sharp(inputPath)
        .webp({ quality: 80 })
        .toFile(outputPath)
        .then(() => {
          console.log(`Converted ${file} to WebP.`);
          // fs.unlinkSync(inputPath); // Optional: delete original
        })
        .catch(err => {
          console.error(`Error converting ${file}:`, err);
        });
    }
  });
});
