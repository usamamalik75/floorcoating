import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Dashboard } from '@/routes/Dashboard'
import { Sales } from '@/routes/Sales'
import { Jobs } from '@/routes/Jobs'
import {
  Customers,
  Estimates,
  Finance,
  Proposals,
  Reports,
  Settings,
  SiteVisits,
} from '@/routes/Modules'
import { OpportunityRecord } from '@/routes/OpportunityRecord'
import { SiteVisit } from '@/routes/SiteVisit'
import { EstimateBuilder } from '@/routes/EstimateBuilder'
import { ProcurementOrderPage } from '@/routes/MaterialOrder'
import { Schedule } from '@/routes/Schedule'
import { LeadIntake } from '@/routes/LeadIntake'
import { FieldJob, FieldToday, FieldVisit } from '@/routes/Field'
import { CustomerProposal, CustomerSignoff } from '@/routes/CustomerProposal'
import { CustomerPayment } from '@/routes/CustomerPayment'
import { StyleGuide } from '@/routes/StyleGuide'
import { Catalogue } from '@/routes/Catalogue'
import { Purchasing } from '@/routes/Purchasing'
import { Communications } from '@/routes/Communications'
import { Admin } from '@/routes/Admin'
import { Prospecting } from '@/routes/Prospecting'

export function App() {
  return (
    <Router>
      <Routes>
        <Route path="/proposal/:token" element={<CustomerProposal />} />
        <Route path="/signoff/:id" element={<CustomerSignoff />} />
        <Route path="/pay/:token" element={<CustomerPayment />} />

        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/site-visits" element={<SiteVisits />} />
          <Route path="/estimates" element={<Estimates />} />
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/catalog" element={<Catalogue />} />
          <Route path="/purchasing" element={<Purchasing />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/communications" element={<Communications />} />
          <Route path="/prospecting" element={<Prospecting />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />

          {/* Legacy redirects */}
          <Route path="/pipeline" element={<Navigate to="/sales" replace />} />
          <Route path="/projects" element={<Navigate to="/jobs" replace />} />
          <Route path="/accounts" element={<Navigate to="/customers" replace />} />
          <Route path="/accounting" element={<Navigate to="/finance" replace />} />
          <Route path="/materials" element={<Navigate to="/purchasing" replace />} />

          <Route path="/intake" element={<LeadIntake />} />
          <Route path="/opportunities/:id" element={<OpportunityRecord />} />
          <Route path="/opportunities/:id/visit" element={<SiteVisit />} />
          <Route path="/opportunities/:id/procurement" element={<ProcurementOrderPage />} />
          <Route path="/opportunities/:id/purchasing" element={<ProcurementOrderPage />} />
          <Route path="/opportunities/:id/material" element={<ProcurementOrderPage />} />
          <Route path="/estimate/:id" element={<EstimateBuilder />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/field" element={<FieldToday />} />
          <Route path="/field/visit/:id" element={<FieldVisit />} />
          <Route path="/field/job/:id" element={<FieldJob />} />
          <Route path="/styleguide" element={<StyleGuide />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  )
}

