#*****************************************************************************/
#     Module        :    %M%
#     Version       :    %I%
#     Version date  :    %E%
#     Version time  :    %U%
#
#*****************************************************************************/
#
# "%Z%  %M%  %I%  %E%  %U% GS ";
#
#******************************************************************************
#                        MODULE INFORMATION AREA
#
#    Module        :    convertApplixMailFolder.ps1
#    Type          :    Power Shell Script
#    Remarks       :    This script will convert an Applix Mail Folder containing
#                            email content, headers and META data and folder info
#                            and convert that to an compatible *.eml file 
#                            that will be import-able into MS Outlook 2026.
#
#    To Dos        :     There are some issues.  like ...
#                       (1)  Some email datas are not being picked up when being
#                               imported.  Sometimes it does get imported. The main
#                               issue is that a lot of emails have the date of 
#                               importation.
#
#    Other Scripts & files referenced or dependencies :
#                       NONE
#
#    Programmer    :    Thomas Uyemura
#
#    Changes made:
#    7/5/2026  T Uyemura Initial Version.
#
#*****************************************************************************/

# Folder containing your Applix mail files
$InputFolder = "D:"

# Folder where all split messages will be stored
$OutputRoot  = "C:\SplitMail"

# Create output root if needed
if (!(Test-Path $OutputRoot)) {
    New-Item -ItemType Directory -Path $OutputRoot | Out-Null
}

foreach ($file in Get-ChildItem -Path $InputFolder -Filter *) {

    Write-Host "Processing $($file.Name)..."

    # Create a subfolder for this file's messages
    $OutputDir = Join-Path $OutputRoot ($file.BaseName)
    if (!(Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir | Out-Null
    }

    $lines = Get-Content $file.FullName

    # ------------------------------------------------------------
    # 1. Detect index block (Folder-Size + End-Index)
    # ------------------------------------------------------------
    $indexFound = $false
    $foundFolderSize = $false

    foreach ($line in $lines) {
        if ($line -like "Folder-Size:*") {
            $foundFolderSize = $true
        }
        if ($foundFolderSize -and $line -eq "End-Index") {
            $indexFound = $true
            break
        }
    }

    # ------------------------------------------------------------
    # 2. Detect delimiter mode for this file
    # ------------------------------------------------------------
    $delimiterMode = 0   # 1 = two-line, 2 = three-line (Message-Id), 3 = three-line (Received)

    for ($i = 0; $i -lt $lines.Count - 2; $i++) {

        # Two-line delimiter: From + Return-Path
        if ($lines[$i] -like "From *" -and
            $lines[$i+1] -like "Return-Path: <*") {
            $delimiterMode = 1
            break
        }

        # Three-line delimiter: From + From: + Message-Id:
        if ($lines[$i] -like "From *" -and
            $lines[$i+1] -like "From:*" -and
            $lines[$i+2] -like "Message-Id:*") {
            $delimiterMode = 2
            break
        }

        # Three-line delimiter: From + Received: from + Received: from
        if ($lines[$i] -like "From *" -and
            $lines[$i+1] -like "Received: from *" -and
            $lines[$i+2] -like "Received: from *") {
            $delimiterMode = 3
            break
        }
    }

    if ($delimiterMode -eq 0) {
        Write-Host "WARNING: No delimiter found in $($file.Name). Entire file will be one message."
    }

    # ------------------------------------------------------------
    # 3. Process file
    # ------------------------------------------------------------
    $messageCount = 0
    $currentMessage = @()

    $inIndex = $indexFound
    $foundFolderSize = $false

    for ($i = 0; $i -lt $lines.Count; $i++) {

        $line = $lines[$i]

        # Skip index block if present
        if ($inIndex) {
            if ($line -like "Folder-Size:*") {
                $foundFolderSize = $true
            }
            if ($foundFolderSize -and $line -eq "End-Index") {
                $inIndex = $false
            }
            continue
        }

        # --------------------------------------------------------
        # Detect delimiter based on chosen mode
        # --------------------------------------------------------
        $isDelimiter = $false

        if ($delimiterMode -eq 1 -and $i -lt $lines.Count - 1) {
            if ($line -like "From *" -and
                $lines[$i+1] -like "Return-Path: <*") {
                $isDelimiter = $true
            }
        }

        if ($delimiterMode -eq 2 -and $i -lt $lines.Count - 2) {
            if ($line -like "From *" -and
                $lines[$i+1] -like "From:*" -and
                $lines[$i+2] -like "Message-Id:*") {
                $isDelimiter = $true
            }
        }

        if ($delimiterMode -eq 3 -and $i -lt $lines.Count - 2) {
            if ($line -like "From *" -and
                $lines[$i+1] -like "Received: from *" -and
                $lines[$i+2] -like "Received: from *") {
                $isDelimiter = $true
            }
        }

        # --------------------------------------------------------
        # Start a new message if delimiter found
        # --------------------------------------------------------
        if ($isDelimiter -and $currentMessage.Count -gt 0) {
            $messageCount++
            $outFile = Join-Path $OutputDir ("message_{0}.eml" -f $messageCount)
            $currentMessage -join "`r`n" | Out-File -FilePath $outFile -Encoding UTF8
            $currentMessage = @()
        }

        # Add line to current message
        $currentMessage += $line
    }

    # Save final message
    if ($currentMessage.Count -gt 0) {
        $messageCount++
        $outFile = Join-Path $OutputDir ("message_{0}.eml" -f $messageCount)
        $currentMessage -join "`r`n" | Out-File -FilePath $outFile -Encoding UTF8
    }

    Write-Host "Finished $($file.Name): $messageCount messages extracted."
}
