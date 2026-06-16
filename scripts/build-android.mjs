/**
 * Build the Maxim Android APK (a thin Capacitor shell loading the live site).
 *   1) prep www/ fallback bundle  2) cap sync  3) gradle assembleDebug
 *   4) copy → ./Maxim-debug.apk
 * Requires Android SDK + a JDK 21 (Android Studio's bundled "jbr" auto-detected).
 * Run once first:  npx cap add android
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, opts = {}) => { console.log(`\n> ${cmd}`); execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts }); };

// 1. www/ fallback (the remote server.url is what actually loads at runtime)
const www = path.join(ROOT, 'www');
fs.mkdirSync(path.join(www, 'assets'), { recursive: true });
for (const f of ['index.html', 'app.js', 'app-views.js', 'styles.css', 'views.css']) fs.copyFileSync(path.join(ROOT, f), path.join(www, f));
fs.copyFileSync(path.join(ROOT, 'assets', 'friedrich.jpg'), path.join(www, 'assets', 'friedrich.jpg'));

// 2. sdk location for gradle
const localProps = path.join(ROOT, 'android', 'local.properties');
if (fs.existsSync(path.join(ROOT, 'android')) && !fs.existsSync(localProps)) {
  const sdk = process.env.ANDROID_HOME || path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
  fs.writeFileSync(localProps, `sdk.dir=${sdk.replace(/\\/g, '/')}\n`);
  console.log(`wrote android/local.properties (sdk.dir=${sdk})`);
}

// 3. sync web assets + plugins into the android project
run('npx cap sync android');

// 4. gradle build
function findJavaHome() {
  if (process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) return process.env.JAVA_HOME;
  for (const d of ['C:/Program Files/Android/Android Studio/jbr', 'C:/Program Files/Android/Android Studio/jre']) if (fs.existsSync(d)) return d;
  return '';
}
const javaHome = findJavaHome();
if (!javaHome) { console.error('No JDK 21 found. Install Android Studio or set JAVA_HOME.'); process.exit(1); }
const gradlew = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
run(`${gradlew} assembleDebug --console=plain`, { cwd: path.join(ROOT, 'android'), env: { ...process.env, JAVA_HOME: javaHome } });

// 5. surface the artifact
const apk = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const out = path.join(ROOT, 'Maxim-debug.apk');
fs.copyFileSync(apk, out);
console.log(`\nAPK ready: Maxim-debug.apk (${(fs.statSync(out).size / 1048576).toFixed(1)} MB)`);
