// Ensures the In-App Purchase capability is recorded in the Xcode project.
//
// Xcode records the capability as a SystemCapabilities entry in the App
// target's TargetAttributes in project.pbxproj. IAP needs no entitlements
// file and no CODE_SIGN_ENTITLEMENTS — there is no StoreKit entitlement key.
//
// A fresh `npx cap add ios` regenerates project.pbxproj without the entry,
// so this runs in CI right after `cap sync ios` (see .github/workflows/build.yml)
// and can be run locally after any platform re-add. It is idempotent: when
// the entry is already present it prints a message and leaves the file alone.
//
// Uses the `xcode` package (node-xcode) — the same library Capacitor's own
// tooling uses to edit this file — so the project is parsed, not regex-ed.
const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

const projectPath = path.resolve(process.argv[2] || 'ios/App/App.xcodeproj/project.pbxproj');
const project = xcode.project(projectPath);
project.parseSync();

const target = project.getFirstTarget();
const attributes = project.getFirstProject().firstProject.attributes;
const targetAttrs = (attributes.TargetAttributes || {})[target.uuid] || {};
const existing = targetAttrs.SystemCapabilities &&
  targetAttrs.SystemCapabilities['com.apple.InAppPurchase'];

if (existing && existing.enabled === 1) {
  console.log('In-App Purchase capability already present, nothing to do.');
  process.exit(0);
}

project.addTargetAttribute(
  'SystemCapabilities',
  { 'com.apple.InAppPurchase': { enabled: 1 } },
  target
);
fs.writeFileSync(projectPath, project.writeSync());
console.log('In-App Purchase capability added to project.pbxproj.');
