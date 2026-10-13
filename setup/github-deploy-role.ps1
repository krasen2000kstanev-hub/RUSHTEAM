# Creates the AWS role GitHub Actions uses to deploy the backend (stack team-hub).
# Trusted ONLY for repo krasen2000kstanev-hub/RUSHTEAM, branch main. Run once:
#   powershell -ExecutionPolicy Bypass -File setup\github-deploy-role.ps1
# Then: GitHub -> RUSHTEAM -> Settings -> Secrets and variables -> Actions ->
#   New repository secret: name AWS_ROLE_ARN, value = the ARN printed below.
# ASCII only: Windows PowerShell 5.1 misreads UTF-8 without BOM.

$ErrorActionPreference = 'Stop'
$account = '674948790853'
$trust = @"
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Federated":"arn:aws:iam::${account}:oidc-provider/token.actions.githubusercontent.com"},"Action":"sts:AssumeRoleWithWebIdentity","Condition":{"StringEquals":{"token.actions.githubusercontent.com:aud":"sts.amazonaws.com"},"StringLike":{"token.actions.githubusercontent.com:sub":["repo:krasen2000kstanev-hub/RUSHTEAM:ref:refs/heads/main","repo:krasen2000kstanev-hub@*/RUSHTEAM@*:ref:refs/heads/main"]}}}]}
"@
# PowerUserAccess has no IAM rights; the stack creates its own roles, so IAM is allowed only for roles team-hub-*.
$iam = @"
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["iam:CreateRole","iam:DeleteRole","iam:GetRole","iam:PassRole","iam:AttachRolePolicy","iam:DetachRolePolicy","iam:PutRolePolicy","iam:DeleteRolePolicy","iam:GetRolePolicy","iam:TagRole","iam:UntagRole","iam:UpdateAssumeRolePolicy","iam:ListRolePolicies","iam:ListAttachedRolePolicies"],"Resource":"arn:aws:iam::${account}:role/team-hub-*"}]}
"@
$t = New-TemporaryFile; $i = New-TemporaryFile
[IO.File]::WriteAllText($t, $trust); [IO.File]::WriteAllText($i, $iam)
$arn = aws iam create-role --role-name rushteam-github-actions --description "GitHub Actions deploy for RUSHTEAM main to stack team-hub" --assume-role-policy-document "file://$t" --query Role.Arn --output text
if (-not $arn) { throw "create-role failed (see the error above)" }
aws iam attach-role-policy --role-name rushteam-github-actions --policy-arn arn:aws:iam::aws:policy/PowerUserAccess
aws iam put-role-policy --role-name rushteam-github-actions --policy-name team-hub-stack-roles --policy-document "file://$i"
Remove-Item $t, $i
Write-Host ""
Write-Host "DONE. Put this into GitHub secret AWS_ROLE_ARN:" -ForegroundColor Green
Write-Host $arn -ForegroundColor Yellow
