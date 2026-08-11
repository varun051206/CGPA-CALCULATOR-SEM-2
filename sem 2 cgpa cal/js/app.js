/* --------------------------------------------------
   CGPA CALCULATOR - BATCH 5 COMPLETE JAVASCRIPT
   Validation, Subject Cards, SGPA/CGPA Math, Motivation,
   Step-by-Step Breakdown, Fixed PDF, Modal Navigation & Google Sheets Integration
-------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    // Configuration Data
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw4wK2Q6TN3Rqr1xY3Y4HFe1x2vjyfKe6NTok8ZFBq74ukODuFpGGB5raor0EX0aXQF/exec';
    const VALID_REG_PREFIX = '91112524';
    const PREV_CREDITS = 23;
    const CURRENT_CREDITS = 28;
    const TOTAL_CREDITS = PREV_CREDITS + CURRENT_CREDITS; // 51

    const SEM2_SUBJECTS = [
        { code: 'AD25201', credits: 4 },
        { code: 'CS25C06', credits: 4 },
        { code: 'EE25C01', credits: 3 },
        { code: 'EN25C02', credits: 2 },
        { code: 'MA25C02', credits: 4 },
        { code: 'PH25C03', credits: 3 },
        { code: 'ME25C05', credits: 4 },
        { code: 'UC25A03', credits: 1 },
        { code: 'UC25A04', credits: 1 },
        { code: 'UC25F01', credits: 1 },
        { code: 'UC25H02', credits: 1 }
    ];

    const GRADE_POINTS = {
        'S': 10,
        'A+': 9,
        'A': 8,
        'B+': 7,
        'B': 6.5,
        'C+': 6,
        'C': 5,
        'U': 0,
        'SA': 0,
        'WC': 0
    };

    const GRADE_OPTIONS = ['S', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'U', 'SA', 'WC'];

    // In-memory State (Single Source of Truth)
    const studentState = {
        regNumber: '',
        name: '',
        prevCgpa: 0,
        grades: {},
        isCalculated: false,
        lastResult: null,    // Complete result payload — single source of truth
        hasSavedResult: false // Guard: ensures exactly ONE Sheets row per calculation
    };

    // DOM Elements - Toast Notification
    const toastNotification = document.getElementById('toast-notification');
    const toastMessage = document.getElementById('toast-message');
    let toastTimeout = null;

    function showToast(message, type = 'success') {
        if (!toastNotification || !toastMessage) return;
        
        clearTimeout(toastTimeout);
        toastMessage.textContent = message;
        
        toastNotification.className = 'toast-notification';
        if (type === 'success') {
            toastNotification.classList.add('toast-success');
        } else {
            toastNotification.classList.add('toast-error');
        }

        // Trigger reflow to ensure animation restarts cleanly
        void toastNotification.offsetWidth;
        toastNotification.classList.add('toast-visible');

        toastTimeout = setTimeout(() => {
            toastNotification.classList.remove('toast-visible');
        }, 4000);
    }

    // DOM Elements - Form & Navigation
    const studentForm = document.getElementById('student-form');
    const regInput = document.getElementById('reg-number');
    const nameInput = document.getElementById('student-name');
    const cgpaInput = document.getElementById('prev-cgpa');

    const regError = document.getElementById('reg-number-error');
    const nameError = document.getElementById('student-name-error');
    const cgpaError = document.getElementById('prev-cgpa-error');

    const studentDetailsScreen = document.getElementById('student-details-screen');
    const subjectSelectionScreen = document.getElementById('subject-selection-screen');
    const resultScreen = document.getElementById('result-screen');

    const subjectsContainer = document.getElementById('subjects-container');
    const calcErrorMessage = document.getElementById('calc-error-message');

    const btnCalculate = document.getElementById('btn-calculate');
    const btnDownloadPdf = document.getElementById('btn-download-pdf');
    const btnBackEdit = document.getElementById('btn-back-edit');
    const btnStartOver = document.getElementById('btn-start-over');
    const btnBack = document.getElementById('btn-back');

    // DOM Elements - Confirmation Modal
    const startOverModal = document.getElementById('start-over-modal');
    const btnModalCancel = document.getElementById('btn-modal-cancel');
    const btnModalConfirm = document.getElementById('btn-modal-confirm');

    // DOM Elements - Summaries & Results
    const summaryName = document.getElementById('summary-name');
    const summaryReg = document.getElementById('summary-reg');
    const summaryCgpa = document.getElementById('summary-cgpa');

    const resultStudentName = document.getElementById('result-student-name');
    const resultStudentReg = document.getElementById('result-student-reg');

    const displaySgpa = document.getElementById('display-sgpa');
    const displayCgpa = document.getElementById('display-cgpa');
    const displayCreditPoints = document.getElementById('display-credit-points');
    const displayMotivation = document.getElementById('display-motivation');

    // DOM Elements - Batch 3 Breakdown Containers
    const breakdownSubjectList = document.getElementById('breakdown-subject-list');
    const breakdownSumExpression = document.getElementById('breakdown-sum-expression');
    const breakdownTotalPointsVal = document.getElementById('breakdown-total-points-val');

    const sgpaStepSub = document.getElementById('sgpa-step-sub');
    const sgpaStepRaw = document.getElementById('sgpa-step-raw');
    const sgpaStepFinal = document.getElementById('sgpa-step-final');

    const cgpaStepInput = document.getElementById('cgpa-step-input');
    const cgpaStepExpanded = document.getElementById('cgpa-step-expanded');
    const cgpaStepSum = document.getElementById('cgpa-step-sum');
    const cgpaStepDiv = document.getElementById('cgpa-step-div');
    const cgpaStepRaw = document.getElementById('cgpa-step-raw');
    const cgpaStepFinal = document.getElementById('cgpa-step-final');

    // DOM Elements - Batch 4 PDF Template Elements
    const pdfTemplateWrapper = document.querySelector('.pdf-template-wrapper');
    const pdfReg = document.getElementById('pdf-reg');
    const pdfName = document.getElementById('pdf-name');
    const pdfPrevCgpa = document.getElementById('pdf-prev-cgpa');
    const pdfSgpa = document.getElementById('pdf-sgpa');
    const pdfCgpa = document.getElementById('pdf-cgpa');
    const pdfTotalPoints = document.getElementById('pdf-total-points');
    const pdfSubjectRows = document.getElementById('pdf-subject-rows');
    const pdfPointsExpr = document.getElementById('pdf-points-expr');
    const pdfSgpaSteps = document.getElementById('pdf-sgpa-steps');
    const pdfCgpaSteps = document.getElementById('pdf-cgpa-steps');
    const pdfMotivation = document.getElementById('pdf-motivation');

    // Helper: Show Input Error
    function showError(input, errorEl, message) {
        const formGroup = input.closest('.form-group');
        if (formGroup) {
            formGroup.classList.add('has-error');
        }
        input.setAttribute('aria-invalid', 'true');
        errorEl.textContent = message;
    }

    // Helper: Clear Input Error
    function clearError(input, errorEl) {
        const formGroup = input.closest('.form-group');
        if (formGroup) {
            formGroup.classList.remove('has-error');
        }
        input.removeAttribute('aria-invalid');
        errorEl.textContent = '';
    }

    // Validation 1: Register Number (Required & Starts with 91112524)
    function validateRegNumber() {
        const value = regInput.value.trim();
        if (!value) {
            showError(regInput, regError, 'Register number is required');
            return false;
        }
        if (!value.startsWith(VALID_REG_PREFIX)) {
            showError(regInput, regError, 'This calculator is only for AI&DS 1st Year students. Valid only for 2nd Semester.');
            return false;
        }
        clearError(regInput, regError);
        return true;
    }

    // Validation 2: Student Name (Required)
    function validateName() {
        const value = nameInput.value.trim();
        if (!value) {
            showError(nameInput, nameError, 'Name is required');
            return false;
        }
        clearError(nameInput, nameError);
        return true;
    }

    // Validation 3: Previous CGPA (Required, Number between 0 and 10)
    function validateCgpa() {
        const rawValue = cgpaInput.value.trim();
        if (!rawValue) {
            showError(cgpaInput, cgpaError, 'Previous CGPA is required');
            return false;
        }
        const numericVal = parseFloat(rawValue);
        if (isNaN(numericVal)) {
            showError(cgpaInput, cgpaError, 'Please enter a valid number');
            return false;
        }
        if (numericVal < 0 || numericVal > 10) {
            showError(cgpaInput, cgpaError, 'CGPA must be between 0 and 10');
            return false;
        }
        clearError(cgpaInput, cgpaError);
        return true;
    }

    // Real-time input clearing
    regInput.addEventListener('input', () => {
        if (regInput.value.trim()) clearError(regInput, regError);
    });
    nameInput.addEventListener('input', () => {
        if (nameInput.value.trim()) clearError(nameInput, nameError);
    });
    cgpaInput.addEventListener('input', () => {
        if (cgpaInput.value.trim()) clearError(cgpaInput, cgpaError);
    });

    regInput.addEventListener('blur', validateRegNumber);
    nameInput.addEventListener('blur', validateName);
    cgpaInput.addEventListener('blur', validateCgpa);

    // Dynamic Subject Cards Rendering
    function renderSubjectCards() {
        subjectsContainer.innerHTML = '';
        SEM2_SUBJECTS.forEach((subject) => {
            const card = document.createElement('div');
            card.className = 'subject-card';
            card.id = `card-${subject.code}`;

            const savedGrade = studentState.grades[subject.code] || '';

            card.innerHTML = `
                <div class="subject-card-header">
                    <span class="subject-code">${subject.code}</span>
                    <span class="subject-credit-badge">${subject.credits} ${subject.credits === 1 ? 'Credit' : 'Credits'}</span>
                </div>
                <div class="subject-select-wrapper">
                    <select class="subject-select" data-code="${subject.code}" data-credits="${subject.credits}">
                        <option value="" ${savedGrade === '' ? 'selected' : ''}>Select Grade</option>
                        ${GRADE_OPTIONS.map(g => `<option value="${g}" ${savedGrade === g ? 'selected' : ''}>Grade ${g}</option>`).join('')}
                    </select>
                </div>
            `;
            subjectsContainer.appendChild(card);
        });

        // Add change listeners to clear error state on selection
        const selects = subjectsContainer.querySelectorAll('.subject-select');
        selects.forEach(select => {
            select.addEventListener('change', (e) => {
                const code = e.target.getAttribute('data-code');
                const card = document.getElementById(`card-${code}`);
                if (card) card.classList.remove('is-unselected');
                if (e.target.value) {
                    studentState.grades[code] = e.target.value;
                } else {
                    delete studentState.grades[code];
                }
                
                // Hide banner if all subjects selected
                const allSelected = SEM2_SUBJECTS.every(s => studentState.grades[s.code]);
                if (allSelected) {
                    calcErrorMessage.classList.add('hidden');
                }
            });
        });
    }

    // Step 1 Submit: Student Details -> Subject Selection
    studentForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const isRegValid = validateRegNumber();
        const isNameValid = validateName();
        const isCgpaValid = validateCgpa();

        if (isRegValid && isNameValid && isCgpaValid) {
            studentState.regNumber = regInput.value.trim();
            studentState.name = nameInput.value.trim();
            studentState.prevCgpa = parseFloat(cgpaInput.value.trim());

            // Populate Summary Badges
            summaryName.textContent = studentState.name;
            summaryReg.textContent = `Reg: ${studentState.regNumber}`;
            summaryCgpa.textContent = studentState.prevCgpa.toFixed(2);

            resultStudentName.textContent = studentState.name;
            resultStudentReg.textContent = `Reg: ${studentState.regNumber}`;

            // Render Subjects
            renderSubjectCards();

            // Switch Screen
            studentDetailsScreen.classList.remove('active');
            studentDetailsScreen.classList.add('hidden');

            resultScreen.classList.remove('active');
            resultScreen.classList.add('hidden');

            subjectSelectionScreen.classList.remove('hidden');
            subjectSelectionScreen.classList.add('active');

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Step 2 Calculation: Grade Check -> SGPA & CGPA Math & Detailed Breakdown
    btnCalculate.addEventListener('click', () => {
        let firstUnselectedCard = null;
        let hasUnselected = false;

        SEM2_SUBJECTS.forEach((subject) => {
            const selectEl = subjectsContainer.querySelector(`select[data-code="${subject.code}"]`);
            const cardEl = document.getElementById(`card-${subject.code}`);
            
            if (!selectEl || !selectEl.value) {
                hasUnselected = true;
                if (cardEl) cardEl.classList.add('is-unselected');
                if (!firstUnselectedCard && cardEl) {
                    firstUnselectedCard = cardEl;
                }
            } else {
                if (cardEl) cardEl.classList.remove('is-unselected');
            }
        });

        if (hasUnselected) {
            calcErrorMessage.classList.remove('hidden');
            if (firstUnselectedCard) {
                firstUnselectedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Hide Error Banner
        calcErrorMessage.classList.add('hidden');

        // Calculate SGPA
        let totalCreditPoints = 0;
        const subjectCalculations = [];
        const productArray = [];

        SEM2_SUBJECTS.forEach((subject) => {
            const grade = studentState.grades[subject.code];
            const gradePoint = GRADE_POINTS[grade] !== undefined ? GRADE_POINTS[grade] : 0;
            const points = subject.credits * gradePoint;
            totalCreditPoints += points;
            productArray.push(points);

            subjectCalculations.push({
                code: subject.code,
                credits: subject.credits,
                grade: grade,
                gradePoint: gradePoint,
                points: points
            });
        });

        const rawSgpa = totalCreditPoints / CURRENT_CREDITS; // 28
        const sgpaFormatted = rawSgpa.toFixed(2);

        // Calculate Overall CGPA using raw unrounded SGPA
        const prevTotalPoints = studentState.prevCgpa * PREV_CREDITS;
        const combinedTotalPoints = prevTotalPoints + totalCreditPoints;
        const rawCgpa = combinedTotalPoints / TOTAL_CREDITS;
        const cgpaFormatted = rawCgpa.toFixed(2);
        const motivationText = getMotivationalComment(rawCgpa);

        // Store result payload in state as single source of truth
        studentState.isCalculated = true;
        studentState.lastResult = {
            totalCreditPoints,
            rawSgpa,
            sgpaFormatted,
            prevTotalPoints,
            combinedTotalPoints,
            rawCgpa,
            cgpaFormatted,
            motivationText,
            subjectCalculations,
            productArray
        };

        // Render Web UI Summary Results
        displaySgpa.textContent = sgpaFormatted;
        displayCgpa.textContent = cgpaFormatted;
        displayCreditPoints.textContent = totalCreditPoints % 1 === 0 ? totalCreditPoints.toFixed(0) : totalCreditPoints.toFixed(1);
        displayMotivation.textContent = motivationText;

        // Render Web UI Breakdown
        renderWebBreakdown(studentState.lastResult);

        // Switch Screen to Result Card
        subjectSelectionScreen.classList.remove('active');
        subjectSelectionScreen.classList.add('hidden');

        resultScreen.classList.remove('hidden');
        resultScreen.classList.add('active');

        window.scrollTo({ top: 0, behavior: 'smooth' });

        // AUTO-SAVE: Fire background save immediately after result is displayed.
        // Non-blocking — result screen is never delayed by Sheets.
        autoSaveToSheets();
    });

    // Helper: Render Web UI Breakdown
    function renderWebBreakdown(result) {
        // Step 1 Breakdown
        breakdownSubjectList.innerHTML = '';
        result.subjectCalculations.forEach((item) => {
            const el = document.createElement('div');
            el.className = 'calc-subject-item';
            el.innerHTML = `
                <div class="calc-subject-info">
                    <span class="calc-subject-code">${item.code}</span>
                    <span class="calc-subject-details">Credit: ${item.credits} &bull; Grade: ${item.grade} (${item.gradePoint} pts)</span>
                </div>
                <div class="calc-subject-math">${item.credits} &times; ${item.gradePoint} = ${item.points}</div>
            `;
            breakdownSubjectList.appendChild(el);
        });

        // Step 2 Breakdown
        breakdownSumExpression.textContent = result.productArray.join(' + ') + ' = ' + result.totalCreditPoints;
        breakdownTotalPointsVal.textContent = result.totalCreditPoints;

        // Step 3 Breakdown
        sgpaStepSub.textContent = `SGPA = ${result.totalCreditPoints} \u00F7 ${CURRENT_CREDITS}`;
        sgpaStepRaw.textContent = `= ${result.rawSgpa.toFixed(4)}...`;
        sgpaStepFinal.textContent = `Final SGPA = ${result.sgpaFormatted}`;

        // Step 4 Breakdown
        cgpaStepInput.textContent = `Previous: ${studentState.prevCgpa.toFixed(2)} (${PREV_CREDITS} cr) | Current SGPA: ${result.rawSgpa.toFixed(4)} (${CURRENT_CREDITS} cr)`;
        cgpaStepExpanded.textContent = `CGPA = ((${studentState.prevCgpa.toFixed(2)} \u00D7 ${PREV_CREDITS}) + (${result.rawSgpa.toFixed(4)} \u00D7 ${CURRENT_CREDITS})) \u00F7 ${TOTAL_CREDITS}`;
        cgpaStepSum.textContent = `CGPA = (${result.prevTotalPoints.toFixed(2)} + ${result.totalCreditPoints}) \u00F7 ${TOTAL_CREDITS}`;
        cgpaStepDiv.textContent = `CGPA = ${result.combinedTotalPoints.toFixed(2)} \u00F7 ${TOTAL_CREDITS}`;
        cgpaStepRaw.textContent = `= ${result.rawCgpa.toFixed(4)}...`;
        cgpaStepFinal.textContent = `Final CGPA = ${result.cgpaFormatted}`;
    }

    // Populate PDF Template with Single Source of Truth
    function populatePdfTemplate(result) {
        pdfReg.textContent = studentState.regNumber;
        pdfName.textContent = studentState.name;
        pdfPrevCgpa.textContent = studentState.prevCgpa.toFixed(2);

        pdfSgpa.textContent = result.sgpaFormatted;
        pdfCgpa.textContent = result.cgpaFormatted;
        pdfTotalPoints.textContent = result.totalCreditPoints;

        // Subject Rows
        pdfSubjectRows.innerHTML = '';
        result.subjectCalculations.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${item.code}</strong></td>
                <td>${item.credits}</td>
                <td><strong>${item.grade}</strong></td>
                <td>${item.gradePoint}</td>
                <td>${item.credits} &times; ${item.gradePoint} = ${item.points}</td>
            `;
            pdfSubjectRows.appendChild(tr);
        });

        // Calculation Steps
        pdfPointsExpr.textContent = `${result.productArray.join(' + ')} = ${result.totalCreditPoints}`;

        pdfSgpaSteps.textContent = 
            `SGPA = ${result.totalCreditPoints} \u00F7 28\n` +
            `SGPA = ${result.rawSgpa.toFixed(4)}...\n` +
            `Final SGPA = ${result.sgpaFormatted}`;

        pdfCgpaSteps.textContent = 
            `CGPA = ((${studentState.prevCgpa.toFixed(2)} \u00D7 23) + (${result.rawSgpa.toFixed(4)} \u00D7 28)) \u00F7 51\n` +
            `CGPA = (${result.prevTotalPoints.toFixed(2)} + ${result.totalCreditPoints}) \u00F7 51\n` +
            `CGPA = ${result.combinedTotalPoints.toFixed(2)} \u00F7 51\n` +
            `CGPA = ${result.rawCgpa.toFixed(4)}...\n` +
            `Final CGPA = ${result.cgpaFormatted}`;

        pdfMotivation.textContent = result.motivationText;
    }

    // BATCH 4: HTML2PDF GENERATION & DOWNLOAD
    if (btnDownloadPdf) {
        btnDownloadPdf.addEventListener('click', () => {
            if (!studentState.isCalculated || !studentState.lastResult) {
                showToast('Unable to generate the PDF. Please try again.', 'error');
                return;
            }

            const result = studentState.lastResult;
            populatePdfTemplate(result);

            const btnTextEl = btnDownloadPdf.querySelector('span');
            const originalText = btnTextEl.textContent;
            btnDownloadPdf.disabled = true;
            btnTextEl.textContent = 'Generating PDF...';

            if (typeof html2pdf !== 'function') {
                showToast('Unable to generate the PDF. Please try again.', 'error');
                btnDownloadPdf.disabled = false;
                btnTextEl.textContent = originalText;
                return;
            }

            // Temporarily make template renderable in active DOM for html2canvas
            if (pdfTemplateWrapper) {
                pdfTemplateWrapper.classList.add('pdf-render-mode');
            }

            const element = document.getElementById('pdf-template');
            const fileName = `CGPA_Report_${studentState.regNumber}.pdf`;

            const opt = {
                margin:       [10, 10, 10, 10],
                filename:     fileName,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0 },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(element).save().then(() => {
                if (pdfTemplateWrapper) {
                    pdfTemplateWrapper.classList.remove('pdf-render-mode');
                }
                btnDownloadPdf.disabled = false;
                btnTextEl.textContent = originalText;
            }).catch((err) => {
                console.error('PDF Generation Error:', err);
                if (pdfTemplateWrapper) {
                    pdfTemplateWrapper.classList.remove('pdf-render-mode');
                }
                showToast('Unable to generate the PDF. Please try again.', 'error');
                btnDownloadPdf.disabled = false;
                btnTextEl.textContent = originalText;
            });
        });
    }

    // --------------------------------------------------
    // BATCH 5: AUTO-SAVE TO GOOGLE SHEETS USING APPS SCRIPT
    // Called automatically after every successful calculation.
    // Fires in the background — does NOT block the result screen.
    // --------------------------------------------------
    async function autoSaveToSheets() {
        console.log('AUTO SAVE: calculate completed');

        // Guard: only one save per calculation session
        if (studentState.hasSavedResult) {
            console.log('AUTO SAVE: skipped — already saved for this calculation');
            return;
        }
        if (!studentState.isCalculated || !studentState.lastResult) {
            console.log('AUTO SAVE: skipped — state not ready:', studentState.isCalculated, studentState.lastResult);
            return;
        }

        // Mark as saved immediately to block any re-entry
        studentState.hasSavedResult = true;

        const result = studentState.lastResult;

        // Build payload strictly from single source of truth
        const payload = {
            registerNumber: studentState.regNumber,
            name: studentState.name,
            previousCgpa: studentState.prevCgpa,
            grades: {
                AD25201: studentState.grades['AD25201'] || '',
                CS25C06: studentState.grades['CS25C06'] || '',
                EE25C01: studentState.grades['EE25C01'] || '',
                EN25C02: studentState.grades['EN25C02'] || '',
                MA25C02: studentState.grades['MA25C02'] || '',
                PH25C03: studentState.grades['PH25C03'] || '',
                ME25C05: studentState.grades['ME25C05'] || '',
                UC25A03: studentState.grades['UC25A03'] || '',
                UC25A04: studentState.grades['UC25A04'] || '',
                UC25F01: studentState.grades['UC25F01'] || '',
                UC25H02: studentState.grades['UC25H02'] || ''
            },
            totalCredits: CURRENT_CREDITS,
            totalCreditPoints: result.totalCreditPoints,
            sgpa: parseFloat(result.sgpaFormatted),
            cgpa: parseFloat(result.cgpaFormatted),
            motivationalComment: result.motivationText
        };

        console.log('AUTO SAVE: sending data to Apps Script', payload);

        try {
            // Content-Type: text/plain avoids CORS preflight while carrying JSON body
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const responseData = await response.json();
            console.log('AUTO SAVE RESPONSE:', responseData);

            // Verify Apps Script explicitly returned success
            if (!responseData.success) {
                throw new Error(responseData.message || 'Apps Script did not confirm success');
            }

            showToast('Result saved automatically.', 'success');

        } catch (error) {
            // Network or parse failure — never block result display
            console.error('[AutoSave] Apps Script Error:', error);
            studentState.hasSavedResult = false; // allow retry if user re-calculates
            showToast('Result calculated, but could not save to Google Sheets.', 'error');
        }
    }

    // --------------------------------------------------
    // RESULT NAVIGATION & START OVER MODAL
    // --------------------------------------------------

    // 1. Back to Edit Button: Return to subject selection with state intact
    if (btnBackEdit) {
        btnBackEdit.addEventListener('click', () => {
            resultScreen.classList.remove('active');
            resultScreen.classList.add('hidden');

            subjectSelectionScreen.classList.remove('hidden');
            subjectSelectionScreen.classList.add('active');

            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Back to Student Details from Subject Selection
    btnBack.addEventListener('click', () => {
        subjectSelectionScreen.classList.remove('active');
        subjectSelectionScreen.classList.add('hidden');

        studentDetailsScreen.classList.remove('hidden');
        studentDetailsScreen.classList.add('active');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 2. Start Over Button: Open Confirmation Modal
    if (btnStartOver) {
        btnStartOver.addEventListener('click', () => {
            startOverModal.classList.remove('hidden');
            startOverModal.setAttribute('aria-hidden', 'false');
        });
    }

    // Modal Cancel: Close Modal without clearing
    if (btnModalCancel) {
        btnModalCancel.addEventListener('click', () => {
            startOverModal.classList.add('hidden');
            startOverModal.setAttribute('aria-hidden', 'true');
        });
    }

    // Modal Confirm: Clear All State & Form, Return to Student Details
    if (btnModalConfirm) {
        btnModalConfirm.addEventListener('click', () => {
            startOverModal.classList.add('hidden');
            startOverModal.setAttribute('aria-hidden', 'true');

            // Clear student state (including save guard so next session saves fresh)
            studentState.regNumber = '';
            studentState.name = '';
            studentState.prevCgpa = 0;
            studentState.grades = {};
            studentState.isCalculated = false;
            studentState.lastResult = null;
            studentState.hasSavedResult = false;

            // Reset HTML Form
            studentForm.reset();

            // Clear inline errors if any
            clearError(regInput, regError);
            clearError(nameInput, nameError);
            clearError(cgpaInput, cgpaError);

            // Switch Screen back to initial Student Details
            resultScreen.classList.remove('active');
            resultScreen.classList.add('hidden');

            subjectSelectionScreen.classList.remove('active');
            subjectSelectionScreen.classList.add('hidden');

            studentDetailsScreen.classList.remove('hidden');
            studentDetailsScreen.classList.add('active');

            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Motivational Comment Helper
    function getMotivationalComment(cgpa) {
        if (cgpa >= 9.0) {
            return "Outstanding! 🔥 You're performing at an excellent level. Keep pushing and aim even higher!";
        } else if (cgpa >= 8.0) {
            return "Excellent work! 💪 You're on a strong track. Keep this consistency and push towards the 9+ zone!";
        } else if (cgpa >= 7.0) {
            return "Good job! 🌱 You're doing well. With a little more consistency, you can definitely cross 8+!";
        } else if (cgpa >= 6.0) {
            return "You're getting there! 🚀 Identify the areas where you can improve and aim for a stronger next semester.";
        } else if (cgpa >= 5.0) {
            return "Keep going! 💗 Every semester is a chance to improve. Stay consistent and work towards your next milestone.";
        } else {
            return "Don't give up! 🌟 This is just one step in your journey. Learn from this semester and come back stronger.";
        }
    }
});
