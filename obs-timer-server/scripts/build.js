const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.join(__dirname, '..'); // obs-timer-server 폴더
const distDir = path.join(projectRoot, 'dist');
const srcMain = path.join(projectRoot, 'src', 'server-main.js');
const bundleOut = path.join(distDir, 'server.bundle.js');
const seaConfig = path.join(projectRoot, 'sea-config.json');
// sea-config.json의 "output" 필드가 "dist/obs-timer-server.blob"으로 되어 있으므로,
// blobOut 경로는 distDir 기준으로 설정합니다.
const blobOut = path.join(distDir, 'obs-timer-server.blob');

let executableName = 'obs-timer-server';
if (os.platform() === 'win32') {
    executableName += '.exe';
}
const executableOut = path.join(distDir, executableName);

function runCommand(command, errorMessage) {
    console.log(`\nExecuting: ${command}`);
    try {
        // npx를 명령어 앞에 붙여 로컬 devDependencies의 CLI를 사용하도록 합니다.
        // execSync는 프로젝트 루트에서 실행되는 것으로 간주합니다.
        execSync(command, { stdio: 'inherit', cwd: projectRoot });
    } catch (error) {
        console.error(`\n${errorMessage || 'Failed to execute'}: ${command}`);
        // error 객체에 stdout, stderr가 포함될 수 있으므로 로깅하는 것이 좋습니다.
        if (error.stdout) console.error("STDOUT:", error.stdout.toString());
        if (error.stderr) console.error("STDERR:", error.stderr.toString());
        process.exit(1);
    }
}

console.log(`Starting build for ${os.platform()}...`);

// 1. Create dist directory if it doesn't exist
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
    console.log(`Created directory: ${distDir}`);
} else {
    console.log(`Directory already exists: ${distDir}`);
}

// 2. esbuild
runCommand(`npx esbuild "${srcMain}" --bundle --outfile="${bundleOut}" --platform=node --format=cjs`, "esbuild failed");

// 3. Node SEA config
// sea-config.json 내의 경로는 sea-config.json 파일 위치 기준이 아니라,
// 명령어가 실행되는 위치(projectRoot)에서 해석되어야 합니다.
// sea-config.json의 main이 "dist/server.bundle.js"로 되어 있으므로, bundleOut 경로와 일치합니다.
runCommand(`node --experimental-sea-config "${seaConfig}"`, "SEA config generation failed");

// 4. Copy Node.js executable
try {
    console.log(`\nCopying Node.js executable from ${process.execPath} to ${executableOut}`);
    fs.copyFileSync(process.execPath, executableOut);
    console.log(`Copied executable to: ${executableOut}`);
} catch (error) {
    console.error(`\nFailed to copy Node.js executable:`, error);
    process.exit(1);
}

// 5. Postject
const sentinelFuse = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'; // 이 FUSE 문자열은 Node.js 버전/OS에 따라 중요할 수 있습니다.
runCommand(`npx postject "${executableOut}" NODE_SEA_BLOB "${blobOut}" --sentinel-fuse ${sentinelFuse} --overwrite`, "Postject failed");

// 6. Cleanup
try {
    console.log(`\nDeleting blob: ${blobOut}`);
    if (fs.existsSync(blobOut)) fs.unlinkSync(blobOut);
    console.log(`Deleting bundle: ${bundleOut}`);
    if (fs.existsSync(bundleOut)) fs.unlinkSync(bundleOut);
    console.log("Cleanup complete.");
} catch (error) {
    console.error(`\nFailed to delete temporary files:`, error);
    // 빌드 자체는 성공했을 수 있으므로 여기서 종료하지는 않습니다.
}

console.log(`\nBuild successful! Output: ${executableOut}`); 