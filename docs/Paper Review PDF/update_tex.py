import sys

file_path = 'c:/Users/prakh/OneDrive/Desktop/proj/FraudGuardAi/docs/Paper Review PDF/re_updated.tex'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Encoding
text = text.replace(
    '\\usepackage[T1]{fontenc}\n\\usepackage{mathptmx}',
    '\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}\n\\usepackage{mathptmx}'
)

# 2. Shorten title
text = text.replace(
    '\\title{FraudGuard AI: A Heterogeneous Penta-Ensemble Approach to Real-Time Financial Fraud Detection}',
    '\\title{FraudGuard AI: A Penta-Ensemble Approach for Real-Time Financial Fraud Detection}'
)

# 3. Figure 1 formatting
text = text.replace(
    '\\begin{figure}[htbp]\n    \\centering\n    \\includegraphics[width=0.95\\columnwidth]{model_comparison.png}',
    '\\begin{figure}[h]\n    \\centering\n    \\includegraphics[width=0.8\\textwidth]{model_comparison.png}'
)

# 4. Figure 2 formatting
text = text.replace(
    '\\begin{figure}[htbp]\n    \\centering\n    \\includegraphics[width=0.85\\columnwidth]{confusion_matrix.png}',
    '\\begin{figure}[h]\n    \\centering\n    \\includegraphics[width=0.8\\textwidth]{confusion_matrix.png}'
)

# 5. In-text reference Figure 2
text = text.replace(
    'Figure \\ref{fig:cm} exposes the exact volume of operations impacted',
    'As shown in Fig.~\\ref{fig:cm}, the confusion matrix exposes the exact volume of operations impacted'
)

# 6. Simplify Methodology Part 1
text = text.replace(
    'The FraudGuard AI methodology is a carefully structured pipeline covering data processing, active mathematical feature engineering, and a Penta-hybrid mathematical classification model.\n\n\\subsection{Dataset Formulation}\nWe evaluate our system utilizing the widely accepted \\textbf{PaySim} dataset \\cite{lopezrojas2016}, which simulates one month of mobile money transactions from an African telecommunications company. Real, unmodified banking databases are highly proprietary and strictly confidential, establishing PaySim as an essential academic standard because it expertly mirrors genuine, macroscopic ledger distributions.\n\nFor this study, we extracted a randomized subset of 1,048,575 discrete transaction events. The target array $ comprises a binary indicator where 1 represents verified fraud and 0 represents a normative legitimate transfer.',
    'The FraudGuard AI methodology covers data processing, feature engineering, and a Penta-hybrid classification model.\n\n\\subsection{Dataset Formulation}\nWe evaluate our system on the \\textbf{PaySim} dataset \\cite{lopezrojas2016}, which simulates 30 days of mobile transactions. Since real banking data is highly proprietary, PaySim serves as an essential academic standard reflecting genuine ledger distributions.\n\nFor this study, we extracted a randomized subset of 1,048,575 discrete transaction events. The target array $ comprises a binary indicator where 1 represents verified fraud and 0 represents a normative legitimate transfer.'
)

# 7. Simplify Methodology Part 2
text = text.replace(
    'Raw transaction logs only provide very basic categorizations: the timestamp (step), nominal amount, sender ID, recipient ID, and the stated ledger balances before and after the event. \n\nHowever, mathematical fraud inherently involves unauthorized monetary redirection. In hostile account takeover scenarios (common in PaySim where fraudsters sequentially run a \\texttt{TRANSFER} into a \\texttt{CASH\\_OUT}), the underlying math of the ledger frequently fails to successfully reconcile due to database race conditions or deliberate spoofing.',
    'Raw logs provide basic fields: timestamp, amount, IDs, and ledger balances. \n\nIn hostile account takeovers, the ledger often fails to reconcile due to database race conditions or spoofing. This mathematical discrepancy inherently helps isolate unauthorized redirection.'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Updates applied to text layout.")
