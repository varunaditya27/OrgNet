# 🌐 OrgNet

**OrgNet** is a private, role-based internal communication and collaboration platform for small-to-mid sized organizations. It is designed with a **top-down tree hierarchy** (like an org chart), ensuring secure, structured communication while maintaining complete end-to-end encryption.

---

## 🚀 Key Features

1. **Tree-Based RBAC (Role-Based Access Control)**

   * Hierarchical structure with parent-child relationships.
   * Immediate communication only:

     * Employees → can connect with peers **and their immediate superior**.
     * Managers → can connect only with their **direct team** (not other teams).
   * Prevents cross-hierarchy chaos, ensures streamlined communication.

2. **Secure Communication**

   * End-to-End Encryption (E2EE) for all messages, files, and calls.
   * Zero upward visibility unless explicitly permitted.
   * Audit logs for superiors to track activity responsibly.

3. **Collaboration Tools**

   * Direct and group messaging.
   * Task & project management boards.
   * File/document sharing with versioning.
   * Company-wide announcements (role-specific visibility).

4. **Role Management & Access Control**

   * Define roles: Admin, Manager, Employee, Intern, etc.
   * Assign permissions dynamically.
   * Auto-generate organizational chart from role hierarchy.

5. **Production-Ready & Scalable**

   * Built on modern backend frameworks (FastAPI/NestJS).
   * Real-time communication (WebSockets).
   * PostgreSQL for structured RBAC data.
   * Cloud-native (Docker, Kubernetes) for seamless scaling.

---

## 📖 How OrgNet Works

* **Hierarchy as a Tree:**

  * Root: Organization Admin.
  * Internal nodes: Managers.
  * Leaves: Employees/Interns.
* **Communication Rules:**

  * Downward: Managers can only communicate with their **direct subtree**.
  * Upward: Employees can only message their **immediate superior**.
  * Horizontal: Peers (same level, same team) can collaborate.
* **Security:**

  * All communication is encrypted (Signal Protocol).
  * Role claims are embedded in JWTs to enforce RBAC at every request.

---

## 🛠️ Tech Stack

* **Frontend:** React + TailwindCSS + TypeScript + shadcn/ui
* **Backend:** NestJS (Node.js)
* **Database:** PostgreSQL + Prisma (RBAC & messaging data)
* **Storage:** S3-compatible (media & file sharing)
* **Messaging Layer:** WebSockets (Socket.IO / native ws)
* **Encryption:** Signal Protocol for E2EE
* **Deployment:** Docker + Kubernetes (scalable microservices)

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/your-org/OrgNet.git
cd OrgNet

# Backend setup
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend setup
cd frontend
npm install
npm run dev
```

---

## 🔒 Security Principles

* **End-to-End Encryption (E2EE):** No one outside sender & receiver can read messages.
* **Strict RBAC Tree Model:** Prevents lateral/cross-hierarchy communication.
* **Zero Knowledge Storage:** Servers cannot decrypt stored content.
* **Auditability:** All actions logged for compliance without breaking privacy.

---

## 📈 Roadmap

* [ ] AI-powered summaries of team updates for managers.
* [ ] Plugin system for HR (leave requests, polls, attendance).
* [ ] Mobile push notifications with E2EE.

---

## 🤝 Contributing

We welcome contributions! Please check out our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📜 License

OrgNet is licensed under the MIT License. See [LICENSE](LICENSE) for more details.

---

### 🔑 Summary

OrgNet isn’t just another messaging app. It’s a **secure, role-based organizational network** designed for productivity, privacy, and structure — built to scale with your team while keeping communication clean and controlled.
