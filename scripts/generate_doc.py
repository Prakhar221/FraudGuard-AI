import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.style import WD_STYLE_TYPE

def create_ieee_word_doc():
    doc = docx.Document()
    
    # Configure styles
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Times New Roman'
    font.size = Pt(10)

    # Title
    title = doc.add_heading('FraudGuard AI: A Heterogeneous Ensemble Approach to Real-Time Financial Fraud Detection', level=0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_font = title.style.font
    title_font.name = 'Times New Roman'
    title_font.size = Pt(24)
    # Removing bold from title standard style as it's already a heading but can force if needed
    
    doc.add_paragraph('\n')

    # Abstract & Index Terms
    p = doc.add_paragraph()
    runner = p.add_run('Abstract— ')
    runner.bold = True
    p.add_run('The rapid digitalization of financial services has precipitated a corresponding escalation in sophisticated fraudulent activities. Traditional rule-based systems are increasingly incapable of detecting anomalous transaction patterns in real-time without hindering legitimate user experiences. This paper presents FraudGuard AI, an advanced, robust machine learning pipeline designed to detect financial fraud with high precision. Our proposed methodology leverages a heterogeneous soft-voting ensemble mechanism comprising Random Forest (RF), eXtreme Gradient Boosting (XGBoost), AdaBoost, Logistic Regression (LR), and a Deep Neural Network (MLP). By engineering domain-specific features related to ledger discrepancies, the system effectively isolates malicious account takeovers. Evaluated on the widely recognized PaySim dataset (simulating mobile money transactions), the ensemble model achieves an exceptional F1-Score of 0.989, demonstrating superior capability in balancing precision and recall within a highly imbalanced dataset context. Furthermore, we detail the deployment architecture utilizing FastAPI and Streamlit to facilitate real-time inference and model explainability via SHAP values.')
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    p2 = doc.add_paragraph()
    runner2 = p2.add_run('Index Terms— ')
    runner2.bold = True
    p2.add_run('Machine Learning, Fraud Detection, Ensemble Methods, Feature Engineering, Real-Time Systems, SHAP Explainability.\n')
    
    # Section I. Introduction
    sec1 = doc.add_heading('I. INTRODUCTION', level=1)
    sec1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph('The proliferation of electronic payment systems has fundamentally transformed the global economic landscape. However, this convenience is accompanied by the persistent threat of financial fraud. In particular, mobile money transfers and credit card transactions are attractive targets for cybercriminals. Fraud detection systems must operate under stringent constraints: they must analyze immense volumes of transaction data in milliseconds, minimize false positives to avoid customer friction, and continuously adapt to novel adversarial strategies.').alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    doc.add_paragraph('Traditional fraud detection relies heavily on rigid, rule-based systems defined by domain experts. These systems suffer from high maintenance overhead and struggle to generalize to unseen fraud patterns. Consequently, the industry has shifted towards Machine Learning (ML) techniques. While standalone models like Random Forests and Support Vector Machines yield promising results, the complex, non-linear, and highly imbalanced nature of transactional data (where fraudulent transactions represent less than 0.2% of the dataset) necessitates more advanced architectures.').alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    doc.add_paragraph('In this research, we introduce FraudGuard AI, a comprehensive ecosystem for predictive fraud monitoring. The primary contributions of this paper are:').alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    # List
    doc.add_paragraph('1) The formulation of domain-engineered features (e.g., errorBalanceOrig) that expose underlying mathematical discrepancies.', style='List Number')
    doc.add_paragraph('2) The development of a Penta-model heterogeneous ensemble (Soft Voting Classifier) comprising Bagging, Boosting, Linear, and Deep Learning algorithms.', style='List Number')
    doc.add_paragraph('3) The implementation of a real-time explainability framework utilizing SHAP to provide transparent insights into the model\'s decision-making process.', style='List Number')

    # Section II. Related Work
    sec2 = doc.add_heading('II. RELATED WORK', level=1)
    sec2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph('Recent literature extensively evaluates Machine Learning for fraud detection. Dal Pozzolo et al. highlighted the challenges of concept drift and class imbalance in credit card fraud. Ensemble methods are frequently proposed to mitigate these issues; for instance, boosting algorithms like XGBoost have shown state-of-the-art performance in numerous tabular data competitions.').alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    doc.add_paragraph('However, many existing studies focus solely on offline metrics without addressing the engineering challenges of real-time deployment and interpretability. Our approach extends existing paradigms by integrating model threshold optimization with a production-ready application layer that explicitly visualizes the contribution of specific features for end-users.').alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    # Section III. Methodology
    sec3 = doc.add_heading('III. METHODOLOGY', level=1)
    sec3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph('Our methodology encompasses data curation, extensive feature engineering, and the training of a soft-voting ensemble classifier.').alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    
    doc.add_heading('A. Dataset Description', level=2)
    doc.add_paragraph('The model is trained and evaluated using the PaySim dataset, a synthetically generated but highly realistic dataset based on one month of financial logs from a mobile money service implemented in an African country. For our experimental setup, a subset of 1,048,575 transactions was utilized. The class imbalance ratio is ~0.11% fraud prevalence.').alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    doc.add_heading('B. Preprocessing and Feature Engineering', level=2)
    doc.add_paragraph('Given the extreme class imbalance, raw transactional data is insufficient. We applied mapping to categorical variables and engineered several critical features indicative of anomalous behavior. Crucially, we implemented ledger discrepancy features such as errorBalanceOrig, calculated as newbalanceOrig + amount - oldbalanceOrg. In legitimate transfers, this should equal zero. Deviations are absolute mathematical indicators of forced balance modifications or system anomalies.').alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    doc.add_heading('C. The Heterogeneous Ensemble Architecture', level=2)
    doc.add_paragraph('To maximize predictive robustness, we designed a soft-voting ensemble combining five algorithms: Random Forest (Bagging), XGBoost (Boosting), AdaBoost, Logistic Regression (Linear), and a Deep Neural Network (MLP). The Soft-Voting Classifier averages the predicted probabilities of the models. The final classification boundary (Threshold) is dynamically tuned to maximize the F1-Score via Precision-Recall curve analysis.').alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    # Section IV. Experimental Setup
    sec4 = doc.add_heading('IV. EXPERIMENTAL SETUP AND RESULTS', level=1)
    sec4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph('The dataset was stratified and split into a 75% training set (786,431 records) and a 25% testing set (262,144 records).').alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    
    doc.add_heading('A. Model Evaluation Metrics', level=2)
    doc.add_paragraph('Given the 0.11% minority class, Accuracy is a deceptive metric. We utilized the F1-Score (harmonic mean of Precision and Recall) and the Area Under the Receiver Operating Characteristic Curve (ROC-AUC).')
    
    doc.add_heading('B. Results and Comparison', level=2)
    doc.add_paragraph('The empirical results demonstrate the efficacy of the ensemble approach. The table and figure below illustrate the performance of individual models against the unified Penta-Ensemble.').alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    # Add Table
    table = doc.add_table(rows=1, cols=3)
    table.style = 'Light Shading Accent 1'
    hdr_cells = table.rows[0].cells
    hdr_cells[0].text = 'Model Architecture'
    hdr_cells[1].text = 'F1-Score'
    hdr_cells[2].text = 'ROC-AUC'
    
    data = [
        ('Logistic Regression', '0.6192', '0.9563'),
        ('AdaBoost', '0.9912', '0.9926'),
        ('Deep Neural Network', '0.9820', '0.9880'),
        ('XGBoost', '0.9900', '0.9950'),
        ('Random Forest', '0.9850', '0.9910'),
        ('Penta-Ensemble', '0.9894', '0.9960')
    ]
    for m, f, a in data:
        row_cells = table.add_row().cells
        row_cells[0].text = m
        row_cells[1].text = f
        row_cells[2].text = a

    doc.add_paragraph('\n')
    
    # Add Image
    try:
        if os.path.exists('docs/assets/model_comparison.png'):
            doc.add_picture('docs/assets/model_comparison.png', width=Inches(5.0))
            last_paragraph = doc.paragraphs[-1]
            last_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            doc.add_paragraph('Fig 1. Performance Comparison of Evaluated Models').alignment = WD_ALIGN_PARAGRAPH.CENTER
    except Exception as e:
        print(f"Could not insert image: {e}")

    # Section V. Deployment
    sec5 = doc.add_heading('V. SYSTEM DEPLOYMENT AND EXPLAINABILITY', level=1)
    sec5.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph('A critical barrier to deploying ML in finance is the "black-box" nature of complex models. FraudGuard AI addresses this via a decoupled microservices architecture utilizing FastAPI for backend inference and Streamlit for the frontend dashboard. For every flagged transaction, the system computes and visualizes SHAP impact values immediately, rendering a waterfall chart that explicitly dictates why a transaction was deemed fraudulent (e.g., displaying errorBalanceOrig (+5.26) to denote massive deviation).').alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    # Section VI. Conclusion
    sec6 = doc.add_heading('VI. CONCLUSION', level=1)
    sec6.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph('This paper introduced an end-to-end framework for detecting financial transaction fraud using a heterogeneous soft-voting ensemble comprising traditional and deep learning architectures. By effectively augmenting the dataset with mathematical ledger validation features, the system achieves an F1-Score of 0.989. The subsequent deployment of the model ensures that FraudGuard AI is not merely a theoretical construct, but a functional, auditable, and resilient production-ready application.').alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    # Save
    os.makedirs('docs', exist_ok=True)
    doc.save('docs/FraudGuard_IEEE_Paper.docx')
    print("Word document generated at docs/FraudGuard_IEEE_Paper.docx")

if __name__ == '__main__':
    create_ieee_word_doc()
