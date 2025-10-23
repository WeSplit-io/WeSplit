@echo off
REM Script pour lancer une analyse de test sur l'image FR1.jpg

echo Lancement de l'extraction sur l'image de test (Dataset/FR1.jpg)...
echo --------------------------------------------------------------------
echo.

REM Initialise Conda et active l'environnement 'temp'
if exist "%USERPROFILE%\miniforge3\Scripts\activate.bat" (
    echo Activation de l'environnement Conda 'temp'...
    call "%USERPROFILE%\miniforge3\Scripts\activate.bat" temp
) else if exist "%USERPROFILE%\miniconda3\Scripts\activate.bat" (
    echo Activation de l'environnement Conda 'temp'...
    call "%USERPROFILE%\miniconda3\Scripts\activate.bat" temp
) else if exist "%USERPROFILE%\anaconda3\Scripts\activate.bat" (
    echo Activation de l'environnement Conda 'temp'...
    call "%USERPROFILE%\anaconda3\Scripts\activate.bat" temp
) else (
    echo ATTENTION: Aucun environnement Conda trouve. Utilisation de Python systeme...
    echo Si Python n'est pas trouve, active manuellement ton environnement avant.
    echo.
)

REM Definit PYTHONPATH pour les imports absolus
set PYTHONPATH=.

python src/main.py "Dataset/FR1.jpg" --pretty %*

if errorlevel 1 (
    echo.
    echo ERREUR: Le script a echoue. Verifie que:
    echo   1. Python est bien installe
    echo   2. Les dependances sont installees: pip install -r requirements.txt
    echo   3. La cle API est configuree dans .env
)

echo.
echo --------------------------------------------------------------------
echo Execution terminee.
pause