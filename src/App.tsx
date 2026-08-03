import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Dashboard } from '@/routes/Dashboard'
import { Sales } from '@/routes/Sales'
import { Jobs } from '@/routes/Jobs'
import {
  Customers,
  Estimates,
  Finance,
  Materials,
  Proposals,
  Reports,
  Settings,
  SiteVisits,
} from '@/routes/Modules'
import { OpportunityRecord } from '@/routes/OpportunityRecord'
import { SiteVisit } from '@/routes/SiteVisit'
import { EstimateBuilder } from '@/routes/EstimateBuilder'
import { MaterialOrder } from '@/routes/MaterialOrder'
import { Schedule } from '@/routes/Schedule'
import { Prospecting } from '@/routes/Prospecting'
import { LeadIntake } from '@/routes/LeadIntake'
import { Admin } from '@/routes/Admin'
import { FmsCatalogue, FmsLocations, FmsOrders } from '@/routes/Fms'
import { FieldJob, FieldToday, FieldVisit } from '@/routes/Field'
import { CustomerProposal, CustomerSignoff } from '@/routes/CustomerProposal'
import { StyleGuide } from '@/routes/StyleGuide'

export function App() {
  return (
    <Router>
      <Routes>
        <Route path="/proposal/:token" element={<CustomerProposal />} />
        <Route path="/signoff/:id" element={<CustomerSignoff />} />

        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/site-visits" element={<SiteVisits />} />
          <Route path="/estimates" element={<Estimates />} />
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />

          {/* Legacy redirects */}
          <Route path="/pipeline" element={<Navigate to="/sales" replace />} />
          <Route path="/projects" element={<Navigate to="/jobs" replace />} />
          <Route path="/accounts" element={<Navigate to="/customers" replace />} />
          <Route path="/accounting" element={<Navigate to="/finance" replace />} />

          <Route path="/intake" element={<LeadIntake />} />
          <Route path="/prospecting" element={<Prospecting />} />
          <Route path="/opportunities/:id" element={<OpportunityRecord />} />
          <Route path="/opportunities/:id/visit" element={<SiteVisit />} />
          <Route path="/opportunities/:id/material" element={<MaterialOrder />} />
          <Route path="/estimate/:id" element={<EstimateBuilder />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/fms/catalogue" element={<FmsCatalogue />} />
          <Route path="/fms/orders" element={<FmsOrders />} />
          <Route path="/fms/locations" element={<FmsLocations />} />
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
