const fs = require('fs');
const path = require('path');

const packagesDirectory = path.resolve(path.join(__dirname, '../packages'));

const masterPackage = require(path.resolve(__dirname, '../package.json'));

const SET_BASIC_SETTINGS = process.env.SET_BASIC_SETTINGS || false;

fs.readdir(packagesDirectory, (err, packageList) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  packageList.forEach(name => {
    const dir = path.join(packagesDirectory, name);
    fs.stat(dir,
      (statErr, stat) => {
        if (statErr) {
          console.error(statErr);
          return ;
        }
        if (stat && stat.isDirectory()) {
          const packageJsonPath = path.join(dir, 'package.json');

          console.log(`modify ${packageJsonPath}`);

          const packageJson = require(packageJsonPath);

          packageJson.version = masterPackage.version;
          if (SET_BASIC_SETTINGS) {
            packageJson.author = masterPackage.author;
            packageJson.bugs = masterPackage.bugs;
            packageJson.homepage = masterPackage.homepage;
            packageJson.keywords = masterPackage.keywords;
            packageJson.repository = masterPackage.repository;
            packageJson.license = masterPackage.license;
          }

          if (packageJson.dependencies) {
            Object.keys(packageJson.dependencies)
              .forEach(key => {
                if (key === 'jswagger-common') {
                  packageJson.dependencies[key] = masterPackage.version;
                }
              });
          }
          fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        }
      });
  });
});

