import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Dashboard } from '@/routes/Dashboard'
import { Pipeline } from '@/routes/Pipeline'
import { OpportunityRecord } from '@/routes/OpportunityRecord'
import { SiteVisit } from '@/routes/SiteVisit'
import { EstimateBuilder } from '@/routes/EstimateBuilder'
import { MaterialOrder } from '@/routes/MaterialOrder'
import { Schedule } from '@/routes/Schedule'
import { Projects } from '@/routes/Projects'
import { Accounting } from '@/routes/Accounting'
import { Prospecting } from '@/routes/Prospecting'
import { LeadIntake } from '@/routes/LeadIntake'
import { Accounts, Admin } from '@/routes/Admin'
import { FmsCatalogue, FmsLocations, FmsOrders } from '@/routes/Fms'
import { FieldJob, FieldToday, FieldVisit } from '@/routes/Field'
import { CustomerProposal, CustomerSignoff } from '@/routes/CustomerProposal'
import { StyleGuide } from '@/routes/StyleGuide'

export function App() {
  return (
    <Router>
      <Routes>
        {/* Customer-facing, deliberately outside the app shell. */}
        <Route path="/proposal/:token" element={<CustomerProposal />} />
        <Route path="/signoff/:id" element={<CustomerSignoff />} />

        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/intake" element={<LeadIntake />} />
          <Route path="/prospecting" element={<Prospecting />} />
          <Route path="/opportunities/:id" element={<OpportunityRecord />} />
          <Route path="/opportunities/:id/visit" element={<SiteVisit />} />
          <Route path="/opportunities/:id/material" element={<MaterialOrder />} />
          <Route path="/estimate/:id" element={<EstimateBuilder />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/accounting" element={<Accounting />} />
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
