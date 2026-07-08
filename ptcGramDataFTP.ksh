#! /bin/ksh
#******************************************************************************
#
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
#    Module        :    ptcgramDataFtp.ksh
#    Type          :    K Shell Script
#    Remarks       :    This script will FTP PTC offline delivery instructions
#                             to the government factory server for further     
#                             processing.
#
#    Other Scripts & files referenced:
#                       NONE
#
#    Programmer    :    Thomas Uyemura
#
#    Changes made:
#    7/5/95  Tom Uyemura Initial Version.
#
#******************************************************************************


if  [ $# != 1 ]
then   echo "*****************************************************************"
       echo "*  Usage: $0 <file1> "
       echo "*****************************************************************"
       exit 9
fi

if  [ -f $1 ]
then   chmod 666 $1
else   echo "*****************************************************************"
       echo "* $1 does not exist - rerun with a valid filename "
       echo "*****************************************************************"
       exit 1
fi

export gvt_add=gvtfactory.hotmail.com
export gvt_user=factjobs
export gvt_passwd=morning

FEEDRES=successfull.ftp

cat <<- EOF | ftp -n  | tee $FEEDRES

        verbose
        prompt off
        open $gvt_add $port
        user $gvt_user $gvt_passwd
        cd /home/factjobs/ptc_recon/infile
        put "$1" srcPools.prn
        close
        quit
        EOF

export gvt_add=
export gvt_user=
export gvt_passwd=

echo "*****************************************************************"
echo "* "

if   [ test -s $FEEDRES ]
then     echo  "  FTP failed to copy file "
else     echo  "  FTP was a Success "
         rm -f $FEEDRES
fi

echo "* "
echo "*****************************************************************"

#******************************************************************************
#   E N D   O F   S C R I P T
#******************************************************************************
