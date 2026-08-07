# HEALNARI Application

HEALNARI is a comprehensive women's healthcare web application built with React and Tailwind CSS. It provides a platform for symptom checking, booking consultations, tracking cycles, and accessing personalized health resources.

## Implementation Diagrams

### 1. Component Architecture

The following diagram illustrates the component hierarchy and structure of the HEALNARI application.

```mermaid
graph TD
    App[App.jsx] --> Header[Header]
    App --> Main[Main Content]
    App --> Footer[Footer]
    
    %% Overlays & Modals
    App --> FloatingCTA[FloatingCTA]
    App --> BloodDropCursor[BloodDropCursor]
    
    %% Modals (Conditional)
    App -.->|isBookingOpen| BookingModal[BookingModal]
    App -.->|isSuccessOpen| SuccessModal[SuccessModal]
    App -.->|isSymptomOpen| SymptomChecker[SymptomChecker]
    
    %% Main Sections
    Main --> Hero[Hero]
    Main --> Stats[Stats]
    Main --> Conditions[Conditions]
    Main --> Doctors[Doctors]
    Main --> HowItWorks[HowItWorks]
    Main --> Outcomes[Outcomes]
    Main --> Testimonials[Testimonials]
    Main --> CycleTracker[CycleTracker]
    Main --> LabTests[LabTests]
    Main --> HealthTips[HealthTips]
    Main --> PremiumCTA[Premium CTA Section]
    Main --> Faq[Faq]
    Main --> NewsletterSignup[NewsletterSignup]
    
    %% Interactions
    Hero -.->|Open Booking| BookingModal
    Hero -.->|Open Checker| SymptomChecker
    Doctors -.->|Select Doctor| BookingModal
    LabTests -.->|Book Test| BookingModal
    FloatingCTA -.->|Book| BookingModal
    BookingModal -.->|Success| SuccessModal
```

### 2. User Flow Diagram

This diagram represents the primary user journeys within the application, such as booking a consultation or using the symptom checker.

```mermaid
journey
    title Patient Consultation Booking Flow
    section Discovery
      Visit Homepage: 5: Patient
      View Conditions/Doctors: 4: Patient
    section Engagement
      Use Symptom Checker: 4: Patient
      Review Assessment: 3: Patient
    section Conversion
      Click Book Consultation: 5: Patient
      Fill Booking Modal: 4: Patient
      Confirm Details: 5: Patient
      View Success Modal: 5: Patient
```

## Setup & Execution

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Development Server:**
   ```bash
   npm run dev
   ```

3. **Build for Production:**
   ```bash
   npm run build
   ```

## Tech Stack
- **Framework:** React (Vite)
- **Styling:** Tailwind CSS
- **Icons:** FontAwesome
- **Animations:** Custom CSS / Tailwind Animations
