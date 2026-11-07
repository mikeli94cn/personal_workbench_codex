param([switch]$Demo, [switch]$Test)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$localMaven = Join-Path $PSScriptRoot 'tools/apache-maven-3.9.11/bin/mvn.cmd'
$maven = if (Test-Path -LiteralPath $localMaven) { $localMaven } else { 'mvn' }
$mavenArgs = @("-Dmaven.repo.local=$PSScriptRoot/tools/m2")
if ($Test) { $mavenArgs += 'test' }
else {
    $mavenArgs += 'spring-boot:run'
    if ($Demo) { $mavenArgs += '-Dspring-boot.run.profiles=demo' }
}
& $maven @mavenArgs
exit $LASTEXITCODE
