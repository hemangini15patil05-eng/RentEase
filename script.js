// ============================================================
    // NEW AUTH FUNCTIONS
    // ============================================================
    let currentLoginTab = "tenant";
    let signupRole = "tenant";

    function switchLoginTab(role) {
      currentLoginTab = role;
      document
        .querySelectorAll(".role-tab")
        .forEach((t) => t.classList.remove("active"));
      const tabEl = document.querySelector(".tab-" + role);
      if (tabEl) tabEl.classList.add("active");
      ["tenant", "owner", "admin"].forEach((r) => {
        const panel = document.getElementById("login-panel-" + r);
        if (panel) panel.classList.toggle("hidden", r !== role);
      });
    }

    function toggleLpPw(inputId, iconEl) {
      const inp = document.getElementById(inputId);
      if (!inp) return;
      if (inp.type === "password") {
        inp.type = "text";
        iconEl.className = "fa-solid fa-eye-slash lp-ir";
      } else {
        inp.type = "password";
        iconEl.className = "fa-solid fa-eye lp-ir";
      }
    }

    function doLoginRole(expectedRole) {
      const pMap = { tenant: "t", owner: "o", admin: "a" };
      const p = pMap[expectedRole];
      const emailEl = document.getElementById(p + "-email");
      const pwEl = document.getElementById(p + "-pw");
      const errEl = document.getElementById("err-" + expectedRole);

      if (!emailEl || !pwEl || !errEl) {
        alert("Login UI not found — please refresh the page.");
        return;
      }

      const email = emailEl.value.trim();
      const pw = pwEl.value.trim();

      // Hide previous errors
      errEl.style.display = "none";
      errEl.textContent = "";

      if (!email || !pw) {
        errEl.textContent = "⚠ Please enter both email and password.";
        errEl.style.display = "block";
        return;
      }

      // Always ensure seed data exists before attempting login
      seedData();

      const users = DB.getUsers();

      if (users.length === 0) {
        errEl.textContent = "⚠ Database is empty. Please refresh the page.";
        errEl.style.display = "block";
        return;
      }

      const user = users.find(
        (u) =>
          u.email.toLowerCase().trim() === email.toLowerCase() && u.pw === pw,
      );

      if (!user) {
        const allEmails = users.map((u) => u.email).join(", ");
        errEl.textContent =
          "✗ Wrong email or password. Available demo: use the hint above.";
        errEl.style.display = "block";
        console.log(
          "Login failed. DB has",
          users.length,
          "users:",
          allEmails,
        );
        return;
      }

      if (user.role !== expectedRole) {
        errEl.textContent =
          '✗ This account role is "' +
          user.role +
          '" — please use the ' +
          user.role.toUpperCase() +
          " tab.";
        errEl.style.display = "block";
        return;
      }

      // SUCCESS
      DB.setCurrentUser(user);
      currentUser = user;
      initLiveState();
      toast("Welcome back, " + user.name.split(" ")[0] + "! 👋");
      routeUser(user);
    }

    function setSignupRole(role) {
      signupRole = role;
      ["tenant", "owner"].forEach((r) => {
        const el = document.getElementById("src-" + r);
        if (el) el.classList.toggle("active", r === role);
      });
      const btn = document.getElementById("signupBtn");
      if (btn)
        btn.className =
          role === "tenant" ? "lp-btn btn-tenant" : "lp-btn btn-owner";
    }

    function doSignup() {
      const first = document.getElementById("su-first").value.trim();
      const last = document.getElementById("su-last").value.trim();
      const email = document.getElementById("su-email").value.trim();
      const phone = document.getElementById("su-phone").value.trim();
      const pw = document.getElementById("su-pw").value.trim();
      const errEl = document.getElementById("signupError");
      errEl.style.display = "none";

      if (!first || !last || !email || !pw) {
        errEl.textContent = "Please fill in all required fields.";
        errEl.style.display = "block";
        return;
      }
      if (pw.length < 6) {
        errEl.textContent = "Password must be at least 6 characters.";
        errEl.style.display = "block";
        return;
      }
      const users = DB.getUsers();
      if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
        errEl.textContent =
          "Email already registered. Please sign in instead.";
        errEl.style.display = "block";
        return;
      }
      const newUser = {
        id: "u" + Date.now(),
        role: signupRole,
        name: first + " " + last,
        email,
        pw,
        phone,
        createdAt: new Date().toISOString().split("T")[0],
      };
      users.push(newUser);
      DB.saveUsers(users);
      DB.setCurrentUser(newUser);
      currentUser = newUser;
      toast("Account created successfully! 🎉");
      initLiveState();
      routeUser(newUser);
    }

    function doLogout() {
      DB.clearCurrentUser();
      currentUser = null;
      currentTenantView = "search";
      currentOwnerView = "dashboard";
      currentAdminView = "dashboard";
      const m = document.getElementById("avatarMenu");
      if (m) m.classList.add("hidden");
      toast("Signed out. See you soon! 👋", "info");
      showPage("page-login");
      switchLoginTab("tenant");
    }

    // stub unused old fns to prevent errors
    function doLogin() {
      doLoginRole(currentLoginTab);
    }
    function showError(id, msg) {
      const e = document.getElementById(id);
      if (e) {
        e.textContent = msg;
        e.style.display = "block";
        setTimeout(() => (e.style.display = "none"), 4000);
      }
    }

    // Quick-fill demo credentials on hint click
    function quickFill(role) {
      const creds = {
        tenant: { email: "tenant@demo.com", pw: "tenant123", prefix: "t" },
        owner: { email: "owner@demo.com", pw: "owner123", prefix: "o" },
        admin: { email: "admin@rentease.com", pw: "admin123", prefix: "a" },
      };
      const c = creds[role];
      if (!c) return;
      const eEl = document.getElementById(c.prefix + "-email");
      const pEl = document.getElementById(c.prefix + "-pw");
      if (eEl) eEl.value = c.email;
      if (pEl) pEl.value = c.pw;
      // Flash animation
      [eEl, pEl].forEach((el) => {
        if (el) {
          el.style.borderColor = "var(--gold)";
          setTimeout(() => (el.style.borderColor = ""), 700);
        }
      });
    }

    // ============================================================
    // CORE DB + DATA + DASHBOARDS
    // ============================================================
    // ============================================================
    // DATABASE (localStorage)
    // ============================================================
    const DB = {
      get(key) {
        try {
          return JSON.parse(localStorage.getItem("re_" + key) || "null");
        } catch {
          return null;
        }
      },
      set(key, val) {
        localStorage.setItem("re_" + key, JSON.stringify(val));
      },
      getUsers() {
        return this.get("users") || [];
      },
      getProperties() {
        return this.get("properties") || [];
      },
      getInquiries() {
        return this.get("inquiries") || [];
      },
      saveUsers(u) {
        this.set("users", u);
      },
      saveProperties(p) {
        this.set("properties", p);
      },
      saveInquiries(i) {
        this.set("inquiries", i);
      },
      getCurrentUser() {
        return this.get("current_user");
      },
      setCurrentUser(u) {
        this.set("current_user", u);
      },
      clearCurrentUser() {
        localStorage.removeItem("re_current_user");
      },
    };

    // ============================================================
    // SEED DATA
    // ============================================================
    function seedData() {
      // Only seed when the DB is completely empty — preserves new signups
      if (DB.getUsers().length > 0) return;
      const users = [
        {
          id: "u1",
          role: "admin",
          name: "Admin User",
          email: "admin@rentease.com",
          pw: "admin123",
          phone: "9900000001",
          createdAt: "2024-01-01",
        },
        {
          id: "u2",
          role: "owner",
          name: "Priya Sharma",
          email: "owner@demo.com",
          pw: "owner123",
          phone: "9876543210",
          createdAt: "2024-01-05",
        },
        {
          id: "u3",
          role: "tenant",
          name: "Rohan Gupta",
          email: "tenant@demo.com",
          pw: "tenant123",
          phone: "9123456789",
          createdAt: "2024-01-10",
        },
        {
          id: "u4",
          role: "owner",
          name: "Suresh Patel",
          email: "suresh@demo.com",
          pw: "pass123",
          phone: "9988776655",
          createdAt: "2024-02-01",
        },
        {
          id: "u5",
          role: "tenant",
          name: "Anjali Singh",
          email: "anjali@demo.com",
          pw: "pass123",
          phone: "9765432100",
          createdAt: "2024-02-15",
        },
      ];
      const props = [
        {
          id: "p1",
          ownerId: "u2",
          type: "house",
          title: "Spacious 3BHK Family House",
          desc: "Beautiful fully furnished house with garden, perfect for families. Recently renovated with modern amenities.",
          state: "Maharashtra",
          district: "Pune",
          area: "Koregaon Park",
          rent: 28000,
          sellPrice: null,
          isForRent: true,
          isForSale: false,
          forWhom: "family",
          rooms: 3,
          bathrooms: 2,
          areaSqft: 1400,
          facilities: [
            "WiFi",
            "Parking",
            "Garden",
            "Geyser",
            "Power Backup",
            "Security",
          ],
          nearbyMess: ["Shri Mess - 200m", "Annapurna Dhaba - 500m"],
          nearbyBus: ["Koregaon Park Stop - 100m", "JM Road - 600m"],
          photos: [
            "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80",
          ],
          status: "active",
          createdAt: "2024-01-15",
          views: 142,
          inquiries: 8,
        },
        {
          id: "p2",
          ownerId: "u2",
          type: "room",
          title: "Private Room in Shared Apartment",
          desc: "Furnished private room with attached bathroom in a co-living apartment. Ideal for working professionals.",
          state: "Maharashtra",
          district: "Pune",
          area: "Viman Nagar",
          rent: 9500,
          sellPrice: null,
          isForRent: true,
          isForSale: false,
          forWhom: "all",
          rooms: 1,
          bathrooms: 1,
          areaSqft: 250,
          facilities: [
            "WiFi",
            "AC",
            "Geyser",
            "Washing Machine",
            "Kitchen Access",
          ],
          nearbyMess: ["Daily Meals Tiffin - 150m", "Veg Paradise - 300m"],
          nearbyBus: ["Viman Nagar Stand - 50m", "Lohegaon Road - 400m"],
          photos: [
            "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80",
          ],
          status: "active",
          createdAt: "2024-01-20",
          views: 89,
          inquiries: 5,
        },
        {
          id: "p3",
          ownerId: "u4",
          type: "hostel",
          title: "Boys PG with Meals Included",
          desc: "Safe and clean boys hostel with meals, WiFi and 24x7 security. Very close to IT companies.",
          state: "Karnataka",
          district: "Bangalore Urban",
          area: "Electronic City",
          rent: 7000,
          sellPrice: null,
          isForRent: true,
          isForSale: false,
          forWhom: "boys",
          rooms: 1,
          bathrooms: 1,
          areaSqft: 120,
          facilities: [
            "WiFi",
            "Meals Included",
            "Laundry",
            "CCTV",
            "Gym Access",
            "Study Room",
          ],
          nearbyMess: [
            "Hostel Mess (included)",
            "South Indian Corner - 200m",
          ],
          nearbyBus: ["Electronic City Phase 1 - 300m", "Hebbagodi - 800m"],
          photos: [
            "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80",
          ],
          status: "active",
          createdAt: "2024-02-01",
          views: 210,
          inquiries: 15,
        },
        {
          id: "p4",
          ownerId: "u4",
          type: "hostel",
          title: "Girls PG near University",
          desc: "Comfortable girls hostel with attached bathrooms, hot water, tiffin service. Strict security, curfew 10PM.",
          state: "Delhi",
          district: "South Delhi",
          area: "Lajpat Nagar",
          rent: 8500,
          sellPrice: null,
          isForRent: true,
          isForSale: false,
          forWhom: "girls",
          rooms: 1,
          bathrooms: 1,
          areaSqft: 130,
          facilities: [
            "WiFi",
            "Tiffin Service",
            "Geyser",
            "CCTV",
            "Locker",
            "Common TV",
          ],
          nearbyMess: ["Home Food Tiffin - 100m", "Punjabi Dhaba - 450m"],
          nearbyBus: ["Lajpat Nagar Metro - 200m", "Ring Road Stop - 500m"],
          photos: [
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
          ],
          status: "active",
          createdAt: "2024-02-10",
          views: 176,
          inquiries: 12,
        },
        {
          id: "p5",
          ownerId: "u2",
          type: "land",
          title: "Residential Plot 1200 sqft",
          desc: "Prime residential plot in a developing area with clear title. Ready for construction. All utilities available.",
          state: "Maharashtra",
          district: "Nashik",
          area: "Gangapur Road",
          rent: null,
          sellPrice: 3200000,
          isForRent: false,
          isForSale: true,
          forWhom: "all",
          rooms: 0,
          bathrooms: 0,
          areaSqft: 1200,
          facilities: [
            "Clear Title",
            "Survey Done",
            "Road Access",
            "Electricity Connection",
          ],
          nearbyMess: [],
          nearbyBus: ["Gangapur Road - 200m", "CBS - 3km"],
          photos: [
            "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
          ],
          status: "active",
          createdAt: "2024-02-20",
          views: 63,
          inquiries: 3,
        },
        {
          id: "p6",
          ownerId: "u4",
          type: "house",
          title: "Studio Apartment for Students",
          desc: "Compact and affordable studio apartment, perfect for students. Near college. All bills included.",
          state: "Gujarat",
          district: "Ahmedabad",
          area: "Navrangpura",
          rent: 7500,
          sellPrice: null,
          isForRent: true,
          isForSale: false,
          forWhom: "students",
          rooms: 1,
          bathrooms: 1,
          areaSqft: 350,
          facilities: [
            "WiFi",
            "AC",
            "Fully Furnished",
            "Bills Included",
            "Kitchen",
          ],
          nearbyMess: ["Tiffin Wala - 100m", "Gujarati Thali - 250m"],
          nearbyBus: [
            "Navrangpura Bus Stop - 50m",
            "Gujarat University - 400m",
          ],
          photos: [
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
          ],
          status: "active",
          createdAt: "2024-03-01",
          views: 98,
          inquiries: 7,
        },
        {
          id: "p7",
          ownerId: "u2",
          type: "house",
          title: "Luxury 4BHK Villa with Pool",
          desc: "Stunning luxury villa with private swimming pool, modular kitchen, home theatre. Premium society.",
          state: "Rajasthan",
          district: "Jaipur",
          area: "Malviya Nagar",
          rent: 65000,
          sellPrice: null,
          isForRent: true,
          isForSale: false,
          forWhom: "family",
          rooms: 4,
          bathrooms: 4,
          areaSqft: 3500,
          facilities: [
            "Swimming Pool",
            "Home Theatre",
            "Modular Kitchen",
            "4 Parking",
            "Garden",
            "CCTV",
            "Security",
            "Gym",
          ],
          nearbyMess: [
            "Rajasthani Bhojnalaya - 1km",
            "City Palace Restaurant - 2km",
          ],
          nearbyBus: ["Malviya Nagar - 300m", "JLN Marg - 600m"],
          photos: [
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
          ],
          status: "active",
          createdAt: "2024-03-10",
          views: 234,
          inquiries: 18,
        },
        {
          id: "p8",
          ownerId: "u4",
          type: "room",
          title: "Single Room near IT Park",
          desc: "Simple clean room with basic amenities. 10 min from Hinjewadi IT park by bus.",
          state: "Maharashtra",
          district: "Pune",
          area: "Hinjewadi",
          rent: 6000,
          sellPrice: null,
          isForRent: true,
          isForSale: false,
          forWhom: "all",
          rooms: 1,
          bathrooms: 1,
          areaSqft: 180,
          facilities: ["WiFi", "Geyser", "Common Kitchen"],
          nearbyMess: ["IT Park Canteen - 500m", "Maratha Dhaba - 200m"],
          nearbyBus: ["Hinjewadi Phase 1 - 100m", "Wakad Bridge - 800m"],
          photos: [
            "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&q=80",
          ],
          status: "active",
          createdAt: "2024-03-15",
          views: 112,
          inquiries: 9,
        },
      ];
      DB.saveUsers(users);
      DB.saveProperties(props);
      DB.saveInquiries([]);
      // No seeded flag — we use getUsers().length check instead
    }

    // ============================================================
    // INDIA GEO DATA
    // ============================================================
    const INDIA_GEO = {
      "Andhra Pradesh": [
        "Visakhapatnam",
        "Vijayawada",
        "Guntur",
        "Tirupati",
        "Kurnool",
        "Nellore",
        "Rajahmundry",
        "Kakinada",
        "Kadapa",
        "Anantapur",
      ],
      "Arunachal Pradesh": [
        "Itanagar",
        "Naharlagun",
        "Pasighat",
        "Tawang",
        "Ziro",
      ],
      Assam: [
        "Guwahati",
        "Dibrugarh",
        "Jorhat",
        "Silchar",
        "Tezpur",
        "Nagaon",
        "Tinsukia",
        "Kamrup",
        "Bongaigaon",
      ],
      Bihar: [
        "Patna",
        "Gaya",
        "Bhagalpur",
        "Muzaffarpur",
        "Darbhanga",
        "Purnia",
        "Arrah",
        "Begusarai",
        "Katihar",
        "Siwan",
      ],
      Chhattisgarh: [
        "Raipur",
        "Bilaspur",
        "Durg",
        "Korba",
        "Bhilai",
        "Jagdalpur",
        "Rajnandgaon",
        "Ambikapur",
      ],
      Goa: ["North Goa", "South Goa"],
      Gujarat: [
        "Ahmedabad",
        "Surat",
        "Vadodara",
        "Rajkot",
        "Gandhinagar",
        "Bhavnagar",
        "Jamnagar",
        "Junagadh",
        "Anand",
        "Mehsana",
      ],
      Haryana: [
        "Gurugram",
        "Faridabad",
        "Ambala",
        "Rohtak",
        "Hisar",
        "Panipat",
        "Sonipat",
        "Karnal",
        "Bhiwani",
        "Rewari",
      ],
      "Himachal Pradesh": [
        "Shimla",
        "Dharamsala",
        "Manali",
        "Solan",
        "Mandi",
        "Kullu",
        "Nahan",
        "Hamirpur",
      ],
      Jharkhand: [
        "Ranchi",
        "Jamshedpur",
        "Dhanbad",
        "Bokaro",
        "Hazaribagh",
        "Deoghar",
        "Giridih",
        "Ramgarh",
      ],
      Karnataka: [
        "Bangalore Urban",
        "Mysuru",
        "Hubli-Dharwad",
        "Mangaluru",
        "Belgaum",
        "Tumkur",
        "Bidar",
        "Shivamogga",
        "Kolar",
        "Hassan",
      ],
      Kerala: [
        "Thiruvananthapuram",
        "Kochi",
        "Kozhikode",
        "Thrissur",
        "Kollam",
        "Kannur",
        "Palakkad",
        "Alappuzha",
        "Malappuram",
        "Kottayam",
      ],
      "Madhya Pradesh": [
        "Bhopal",
        "Indore",
        "Gwalior",
        "Jabalpur",
        "Ujjain",
        "Sagar",
        "Ratlam",
        "Satna",
        "Rewa",
        "Dewas",
      ],
      Maharashtra: [
        "Mumbai",
        "Pune",
        "Nashik",
        "Nagpur",
        "Aurangabad",
        "Solapur",
        "Kolhapur",
        "Thane",
        "Raigad",
        "Satara",
        "Amravati",
        "Sangli",
      ],
      Manipur: [
        "Imphal East",
        "Imphal West",
        "Bishnupur",
        "Thoubal",
        "Churachandpur",
      ],
      Meghalaya: [
        "East Khasi Hills",
        "West Khasi Hills",
        "Ri Bhoi",
        "East Jaintia Hills",
        "West Garo Hills",
      ],
      Mizoram: ["Aizawl", "Lunglei", "Champhai", "Serchhip", "Kolasib"],
      Nagaland: ["Kohima", "Dimapur", "Mokokchung", "Wokha", "Zunheboto"],
      Odisha: [
        "Bhubaneswar",
        "Cuttack",
        "Rourkela",
        "Puri",
        "Sambalpur",
        "Berhampur",
        "Balasore",
        "Baripada",
      ],
      Punjab: [
        "Amritsar",
        "Ludhiana",
        "Jalandhar",
        "Patiala",
        "Chandigarh",
        "Bathinda",
        "Mohali",
        "Pathankot",
      ],
      Rajasthan: [
        "Jaipur",
        "Jodhpur",
        "Udaipur",
        "Kota",
        "Ajmer",
        "Bikaner",
        "Alwar",
        "Bharatpur",
        "Sikar",
        "Pali",
      ],
      Sikkim: ["East Sikkim", "West Sikkim", "North Sikkim", "South Sikkim"],
      "Tamil Nadu": [
        "Chennai",
        "Coimbatore",
        "Madurai",
        "Trichy",
        "Salem",
        "Erode",
        "Tirunelveli",
        "Vellore",
        "Thanjavur",
        "Tiruppur",
      ],
      Telangana: [
        "Hyderabad",
        "Warangal",
        "Nizamabad",
        "Karimnagar",
        "Khammam",
        "Mahbubnagar",
        "Nalgonda",
        "Adilabad",
      ],
      Tripura: ["West Tripura", "South Tripura", "North Tripura", "Gomati"],
      "Uttar Pradesh": [
        "Lucknow",
        "Agra",
        "Varanasi",
        "Kanpur",
        "Allahabad",
        "Meerut",
        "Noida",
        "Ghaziabad",
        "Bareilly",
        "Aligarh",
        "Gorakhpur",
        "Moradabad",
      ],
      Uttarakhand: [
        "Dehradun",
        "Haridwar",
        "Nainital",
        "Roorkee",
        "Haldwani",
        "Rishikesh",
        "Mussoorie",
        "Almora",
      ],
      "West Bengal": [
        "Kolkata",
        "Howrah",
        "Darjeeling",
        "Siliguri",
        "Asansol",
        "Durgapur",
        "Bardhaman",
        "Malda",
        "Murshidabad",
      ],
      Delhi: [
        "Central Delhi",
        "East Delhi",
        "New Delhi",
        "North Delhi",
        "North East Delhi",
        "North West Delhi",
        "Shahdara",
        "South Delhi",
        "South East Delhi",
        "South West Delhi",
        "West Delhi",
        "Dwarka",
        "Rohini",
      ],
      "Jammu & Kashmir": [
        "Srinagar",
        "Jammu",
        "Anantnag",
        "Baramulla",
        "Budgam",
        "Kupwara",
        "Leh",
      ],
      Ladakh: ["Leh", "Kargil"],
      Puducherry: ["Puducherry", "Karaikal", "Mahe", "Yanam"],
      Chandigarh: ["Chandigarh"],
      "Andaman & Nicobar Islands": [
        "South Andaman",
        "North & Middle Andaman",
        "Nicobar",
      ],
      "Dadra & Nagar Haveli": ["Dadra & Nagar Haveli"],
      "Daman & Diu": ["Daman", "Diu"],
      Lakshadweep: ["Agatti", "Minicoy", "Amini"],
    };

    const AREA_MAP = {
      Pune: [
        "Koregaon Park",
        "Viman Nagar",
        "Hinjewadi",
        "Wakad",
        "Baner",
        "Kothrud",
        "Hadapsar",
        "Kalyani Nagar",
        "Magarpatta",
        "Pimpri",
      ],
      Mumbai: [
        "Andheri",
        "Bandra",
        "Powai",
        "Thane West",
        "Malad",
        "Goregaon",
        "Vikhroli",
        "Dadar",
        "Kurla",
        "Navi Mumbai",
      ],
      Nashik: [
        "Gangapur Road",
        "College Road",
        "Trimbak Road",
        "Panchavati",
        "Satpur MIDC",
        "Cidco",
        "Dwarka",
        "Mhasrul",
      ],
      Nagpur: [
        "Dharampeth",
        "Sitabuldi",
        "Civil Lines",
        "Gandhibagh",
        "Manish Nagar",
        "Hingna",
        "Wardhaman Nagar",
      ],
      "Bangalore Urban": [
        "Koramangala",
        "Indiranagar",
        "Electronic City",
        "Whitefield",
        "BTM Layout",
        "HSR Layout",
        "Marathahalli",
        "Jayanagar",
        "Malleswaram",
        "Yelahanka",
      ],
      Chennai: [
        "Anna Nagar",
        "Velachery",
        "OMR",
        "Porur",
        "Tambaram",
        "Adyar",
        "T Nagar",
        "Mylapore",
        "Vadapalani",
        "Perambur",
      ],
      Hyderabad: [
        "Hitech City",
        "Madhapur",
        "Gachibowli",
        "Banjara Hills",
        "Jubilee Hills",
        "Kondapur",
        "Begumpet",
        "Ameerpet",
        "Manikonda",
        "Kukatpally",
      ],
      Delhi: [
        "Karol Bagh",
        "Lajpat Nagar",
        "Saket",
        "Dwarka",
        "Rohini",
        "Vasant Kunj",
        "Pitampura",
        "Janakpuri",
        "Mayur Vihar",
        "Preet Vihar",
      ],
      "South Delhi": [
        "Lajpat Nagar",
        "Saket",
        "Malviya Nagar",
        "Green Park",
        "Hauz Khas",
        "Kalkaji",
        "Nehru Place",
        "Okhla",
        "Vasant Vihar",
      ],
      Jaipur: [
        "Malviya Nagar",
        "Civil Lines",
        "Vaishali Nagar",
        "Mansarovar",
        "Tonk Road",
        "C-Scheme",
        "Jagatpura",
        "Sanganer",
      ],
      Ahmedabad: [
        "Navrangpura",
        "Satellite",
        "Prahlad Nagar",
        "Bopal",
        "Thaltej",
        "Maninagar",
        "Vatva",
        "Paldi",
      ],
      Kolkata: [
        "Salt Lake",
        "New Town",
        "Ballygunge",
        "Park Street",
        "Behala",
        "Dum Dum",
        "Tollygunge",
        "Howrah",
      ],
    };

    function getAreas(district) {
      return (
        AREA_MAP[district] || [
          "Area 1",
          "Area 2",
          "Area 3",
          "Area 4",
          "Area 5",
          "Other Areas",
        ]
      );
    }

    // ============================================================
    // UI HELPERS
    // ============================================================
    let currentUser = null;
    let currentTenantView = "search";
    let currentOwnerView = "dashboard";
    let currentAdminView = "dashboard";
    let selectedRole = "tenant";
    let favProperties = [];

    function showPage(id) {
      document
        .querySelectorAll(".page")
        .forEach((p) => p.classList.add("hidden"));
      document.getElementById(id).classList.remove("hidden");
      document.getElementById("avatarMenu").classList.add("hidden");
    }

    function toast(msg, type = "success") {
      const t = document.createElement("div");
      t.className = `toast toast-${type}`;
      const icons = {
        success: "fa-check",
        error: "fa-xmark",
        info: "fa-info",
      };
      t.innerHTML = `<div class="toast-icon"><i class="fa-solid ${icons[type] || "fa-info"}"></i></div><div class="toast-msg">${msg}</div>`;
      document.getElementById("toastContainer").appendChild(t);
      setTimeout(() => t.remove(), 3500);
    }

    function closeModal(id) {
      document.getElementById(id).classList.add("hidden");
    }
    function openModal(id) {
      document.getElementById(id).classList.remove("hidden");
    }

    function togglePw(id, el) {
      const inp = document.getElementById(id);
      if (inp.type === "password") {
        inp.type = "text";
        el.className = "fa-solid fa-eye-slash toggle-pw";
      } else {
        inp.type = "password";
        el.className = "fa-solid fa-eye toggle-pw";
      }
    }

    function fmt(n) {
      return n ? "₹" + n.toLocaleString("en-IN") : "—";
    }

    function typeLabel(t) {
      return (
        {
          house: "🏠 House",
          room: "🛏 Private Room",
          hostel: "🏨 Hostel / PG",
          land: "🌿 Land / Plot",
        }[t] || t
      );
    }

    function forWhomLabel(f) {
      return (
        {
          family: "👨‍👩‍👧 Family",
          students: "🎓 Students",
          boys: "👦 Boys",
          girls: "👧 Girls",
          all: "🌐 All",
        }[f] || f
      );
    }

    function routeUser(user) {
      if (user.role === "admin") {
        showPage("page-admin");
        renderAdmin();
      } else if (user.role === "owner") {
        showPage("page-owner");
        renderOwner();
      } else {
        showPage("page-tenant");
        renderTenant();
      }
    }

    // ============================================================
    // NAVBAR & SIDEBAR BUILDERS
    // ============================================================
    function buildNavbar(container, role) {
      const u = currentUser;
      const initials = u.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
      container.innerHTML = `
  <nav class="navbar">
    <a class="nav-logo" href="#"><div class="logo-sq"><i class="fa-solid fa-house-chimney"></i></div><span>Rent<em>Ease</em></span></a>
    <div class="nav-center">
      ${role === "tenant"
          ? `
        <button class="nav-link ${currentTenantView === "search" ? "active" : ""}" onclick="setTenantView('search')">Browse</button>
        <button class="nav-link ${currentTenantView === "saved" ? "active" : ""}" onclick="setTenantView('saved')">Saved</button>
        <button class="nav-link ${currentTenantView === "inquiries" ? "active" : ""}" onclick="setTenantView('inquiries')">Inquiries</button>
        <button class="nav-link ${currentTenantView === "transactions" ? "active" : ""}" onclick="setTenantView('transactions')">💳 Payments</button>
      `
          : ""
        }
      ${role === "owner"
          ? `
        <button class="nav-link ${currentOwnerView === "dashboard" ? "active" : ""}" onclick="setOwnerView('dashboard')">Dashboard</button>
        <button class="nav-link ${currentOwnerView === "myprops" ? "active" : ""}" onclick="setOwnerView('myprops')">My Listings</button>
        <button class="nav-link ${currentOwnerView === "payments" ? "active" : ""}" onclick="setOwnerView('payments')">💰 Rent Tracker</button>
        <button class="nav-link ${currentOwnerView === "addprop" ? "active" : ""}" onclick="openAddPropModal()">+ Add Listing</button>
      `
          : ""
        }
      ${role === "admin"
          ? `
        <button class="nav-link ${currentAdminView === "dashboard" ? "active" : ""}" onclick="setAdminView('dashboard')">Dashboard</button>
        <button class="nav-link ${currentAdminView === "users" ? "active" : ""}" onclick="setAdminView('users')">Users <span class="notif-dot">${DB.getUsers().length}</span></button>
        <button class="nav-link ${currentAdminView === "props" ? "active" : ""}" onclick="setAdminView('props')">Properties <span class="notif-dot">${DB.getProperties().length}</span></button>
      `
          : ""
        }
    </div>
    <div class="nav-right">
      <div class="nav-avatar" onclick="toggleAvatarMenu()" style="font-family:'Plus Jakarta Sans',sans-serif">${initials}</div>
    </div>
  </nav>`;
    }

    function toggleAvatarMenu() {
      const m = document.getElementById("avatarMenu");
      m.classList.toggle("hidden");
      if (!m.classList.contains("hidden")) {
        const av = document.querySelector(".nav-avatar");
        const r = av.getBoundingClientRect();
        m.style.position = "fixed";
        m.style.top = r.bottom + 8 + "px";
        m.style.right = window.innerWidth - r.right + "px";
        m.style.zIndex = 9999;
      }
    }
    document.addEventListener("click", (e) => {
      if (
        !e.target.closest(".nav-avatar") &&
        !e.target.closest("#avatarMenu")
      ) {
        document.getElementById("avatarMenu").classList.add("hidden");
      }
    });

    // ============================================================
    // ANIMATED LOGIN BACKGROUND
    // ============================================================
    function buildLoginBg(bgId) {
      const c = document.getElementById(bgId);
      if (!c) return;
      const icons = [
        "fa-house-chimney",
        "fa-building",
        "fa-store",
        "fa-hotel",
        "fa-city",
        "fa-home",
        "fa-warehouse",
        "fa-tree",
      ];
      const sizes = [40, 60, 80, 50, 70, 45, 55, 65];
      for (let i = 0; i < 8; i++) {
        const d = document.createElement("div");
        d.className = "float-icon";
        d.style.left = `${10 + i * 12}%`;
        d.style.top = `${10 + Math.random() * 70}%`;
        d.style.fontSize = sizes[i] + "px";
        d.innerHTML = `<i class="fa-solid ${icons[i]}"></i>`;
        c.appendChild(d);
      }
      for (let i = 0; i < 30; i++) {
        const p = document.createElement("div");
        p.className = "particle-dot";
        p.style.left = Math.random() * 100 + "%";
        p.style.bottom = "0";
        p.style.animationDuration = 4 + Math.random() * 8 + "s";
        p.style.animationDelay = Math.random() * 5 + "s";
        p.style.width = p.style.height = 1 + Math.random() * 3 + "px";
        c.appendChild(p);
      }
    }

    // ============================================================
    // TENANT DASHBOARD
    // ============================================================
    let tenantState = {
      state: "",
      district: "",
      area: "",
      type: "all",
      maxPrice: 300000,
      forWhom: "all",
      search: "",
    };

    function buildSidebarTenant() {
      return `
    <div class="sidebar-label">Browse</div>
    <button class="sidebar-item ${currentTenantView === "search" ? "active" : ""}" onclick="setTenantView('search')"><span class="si-icon">🔍</span> Find Properties</button>
    <button class="sidebar-item ${currentTenantView === "saved" ? "active" : ""}" onclick="setTenantView('saved')"><span class="si-icon">❤️</span> Saved Homes</button>
    <div style="margin:12px 0 8px"><div class="sidebar-label">My Account</div></div>
    <button class="sidebar-item ${currentTenantView === "inquiries" ? "active" : ""}" onclick="setTenantView('inquiries')"><span class="si-icon">📬</span> My Inquiries</button>
    <button class="sidebar-item ${currentTenantView === "transactions" ? "active" : ""}" onclick="setTenantView('transactions')"><span class="si-icon">💳</span> Payments</button>
    <div style="margin-top:auto;padding-top:16px;border-top:1px solid var(--cream3);margin:auto 0 0">
      <button class="sidebar-item" onclick="doLogout()"><span class="si-icon">🚪</span> Sign Out</button>
    </div>`;
    }

    function buildSidebarOwner() {
      return `
    <div class="sidebar-label">Management</div>
    <button class="sidebar-item ${currentOwnerView === "dashboard" ? "active" : ""}" onclick="setOwnerView('dashboard')"><span class="si-icon">📊</span> Dashboard</button>
    <button class="sidebar-item ${currentOwnerView === "myprops" ? "active" : ""}" onclick="setOwnerView('myprops')"><span class="si-icon">🏠</span> My Listings</button>
    <button class="sidebar-item ${currentOwnerView === "payments" ? "active" : ""}" onclick="setOwnerView('payments')"><span class="si-icon">💰</span> Rent Tracker</button>
    <button class="sidebar-item" onclick="openAddPropModal()"><span class="si-icon">➕</span> Add Listing</button>
    <div style="margin:12px 0 8px"><div class="sidebar-label">Account</div></div>
    <button class="sidebar-item" onclick="doLogout()"><span class="si-icon">🚪</span> Sign Out</button>`;
    }

    function buildSidebarAdmin() {
      return `
    <div class="sidebar-label">Admin Panel</div>
    <button class="sidebar-item ${currentAdminView === "dashboard" ? "active" : ""}" onclick="setAdminView('dashboard')"><span class="si-icon">📊</span> Dashboard</button>
    <button class="sidebar-item ${currentAdminView === "users" ? "active" : ""}" onclick="setAdminView('users')"><span class="si-icon">👥</span> Manage Users</button>
    <button class="sidebar-item ${currentAdminView === "props" ? "active" : ""}" onclick="setAdminView('props')"><span class="si-icon">🏘️</span> All Properties</button>
    <div style="margin:12px 0 8px"><div class="sidebar-label">Account</div></div>
    <button class="sidebar-item" onclick="doLogout()"><span class="si-icon">🚪</span> Sign Out</button>`;
    }

    function renderTenant() {
      buildNavbar(document.getElementById("tenantNavbar"), "tenant");
      document.getElementById("tenantSidebar").innerHTML =
        buildSidebarTenant();
      renderTenantContent();
    }

    function setTenantView(v) {
      currentTenantView = v;
      buildNavbar(document.getElementById("tenantNavbar"), "tenant");
      document.getElementById("tenantSidebar").innerHTML =
        buildSidebarTenant();
      renderTenantContent();
    }

    function renderTenantContent() {
      const mc = document.getElementById("tenantMainContent");
      if (currentTenantView === "search") mc.innerHTML = buildTenantSearch();
      else if (currentTenantView === "saved")
        mc.innerHTML = buildTenantSaved();
      else if (currentTenantView === "transactions")
        mc.innerHTML = buildTenantTransactions();
      else mc.innerHTML = buildTenantInquiries();
      bindSearchEvents();
    }

    function buildTenantSearch() {
      const states = Object.keys(INDIA_GEO).sort();
      const districts = tenantState.state ? INDIA_GEO[tenantState.state] : [];
      const areas = tenantState.district
        ? getAreas(tenantState.district)
        : [];

      return `
  <div class="search-hero">
    <h2>Find Your Perfect Place</h2>
    <p>Search from thousands of verified properties across India</p>
    <div class="search-bar">
      <select class="search-select" id="ss-state" onchange="onStateChange()">
        <option value="">All States</option>
        ${states.map((s) => `<option value="${s}" ${tenantState.state === s ? "selected" : ""}>${s}</option>`).join("")}
      </select>
      <div class="search-divider"></div>
      <select class="search-select" id="ss-district" onchange="onDistrictChange()" ${!tenantState.state ? "disabled" : ""}>
        <option value="">All Districts</option>
        ${districts.map((d) => `<option value="${d}" ${tenantState.district === d ? "selected" : ""}>${d}</option>`).join("")}
      </select>
      <div class="search-divider"></div>
      <select class="search-select" id="ss-area" ${!tenantState.district ? "disabled" : ""}>
        <option value="">All Areas</option>
        ${areas.map((a) => `<option value="${a}" ${tenantState.area === a ? "selected" : ""}>${a}</option>`).join("")}
      </select>
      <div class="search-divider"></div>
      <button class="search-btn" onclick="applySearch()"><i class="fa-solid fa-magnifying-glass"></i> Search</button>
    </div>
  </div>
  <div class="filter-bar">
    <span class="filter-label">Type:</span>
    ${["all", "house", "room", "hostel", "land"]
          .map(
            (t) => `
      <div class="filter-pill ${tenantState.type === t ? "active" : ""}" onclick="setFilter('type','${t}')">${typeLabel2(t)}</div>
    `,
          )
          .join("")}
    <div class="search-divider" style="height:28px;width:1px;background:var(--cream3)"></div>
    <span class="filter-label">For:</span>
    ${["all", "family", "students", "boys", "girls"]
          .map(
            (f) => `
      <div class="filter-pill ${tenantState.forWhom === f ? "active" : ""}" onclick="setFilter('forWhom','${f}')">${forWhomLabel2(f)}</div>
    `,
          )
          .join("")}
    
    <div class="search-divider" style="height:28px;width:1px;background:var(--cream3);margin-left:auto"></div>
    <div style="display:flex;align-items:center;gap:12px;padding-right:8px">
      <span class="filter-label" style="display:flex;align-items:center;gap:6px">Max Rate: <span id="maxRateDisplay" style="color:var(--navy);font-weight:800;font-size:13px;background:rgba(245,166,35,.15);padding:2px 8px;border-radius:6px;min-width:65px;text-align:center">${tenantState.maxPrice >= 300000 ? "Any" : fmt(tenantState.maxPrice)}</span></span>
      <input type="range" class="price-slider" min="5000" max="300000" step="5000" value="${tenantState.maxPrice}" 
        oninput="document.getElementById('maxRateDisplay').innerText=this.value>=300000?'Any':fmt(this.value)" 
        onchange="setFilter('maxPrice', parseInt(this.value))" 
        style="width:130px;accent-color:var(--gold3);cursor:pointer;height:4px;background:var(--cream3);border-radius:4px;outline:none">
    </div>
  </div>
  <div id="propResults">
    ${renderPropGrid()}
  </div>`;
    }

    function typeLabel2(t) {
      return (
        {
          all: "All",
          house: "Houses",
          room: "Rooms",
          hostel: "Hostels/PG",
          land: "Land",
        }[t] || t
      );
    }
    function forWhomLabel2(f) {
      return (
        {
          all: "Anyone",
          family: "Family",
          students: "Students",
          boys: "Boys",
          girls: "Girls",
        }[f] || f
      );
    }

    function renderPropGrid() {
      let props = DB.getProperties().filter((p) => p.status === "active");
      if (tenantState.state)
        props = props.filter((p) => p.state === tenantState.state);
      if (tenantState.district)
        props = props.filter((p) => p.district === tenantState.district);
      if (tenantState.area)
        props = props.filter((p) => p.area === tenantState.area);
      if (tenantState.type !== "all")
        props = props.filter((p) => p.type === tenantState.type);
      if (tenantState.forWhom !== "all")
        props = props.filter(
          (p) => p.forWhom === tenantState.forWhom || p.forWhom === "all",
        );

      if (tenantState.maxPrice && tenantState.maxPrice < 300000) {
        props = props.filter((p) => {
          const val = p.isForRent ? p.rent : p.sellPrice;
          return val <= tenantState.maxPrice;
        });
      }

      if (!props.length)
        return `<div class="empty-state"><i class="fa-solid fa-house-circle-xmark"></i><h3>No properties found</h3><p>Try adjusting your search filters</p></div>`;
      return `<div class="section-header"><div><div class="section-title">Available Properties</div><div class="section-subtitle">${props.length} listing${props.length !== 1 ? "s" : ""} found</div></div></div>
  <div class="prop-grid">${props.map((p) => buildPropCard(p)).join("")}</div>`;
    }

    function buildPropCard(p) {
      const isFav = favProperties.includes(p.id);
      const price = p.isForRent ? fmt(p.rent) + "/mo" : fmt(p.sellPrice);
      const badgeClass =
        p.type === "hostel"
          ? "badge-hostel"
          : p.type === "land"
            ? "badge-land"
            : p.isForSale
              ? "badge-sell"
              : "badge-rent";
      const badgeText = p.isForSale
        ? "FOR SALE"
        : p.type === "hostel"
          ? "PG/HOSTEL"
          : "FOR RENT";
      const imgSrc = p.photos && p.photos[0] ? p.photos[0] : "";
      const isOwner = currentUser && currentUser.id === p.ownerId;
      return `
  <div class="prop-card" onclick="openPropDetail('${p.id}')" style="animation-delay:${Math.random() * 0.3}s">
    <div class="prop-img">
      ${imgSrc ? `<img src="${imgSrc}" alt="${p.title}" onerror="this.parentNode.innerHTML='<div class=prop-img-placeholder><i class=fa-solid\\ fa-house></i><span>No photo</span></div>'">` : `<div class="prop-img-placeholder"><i class="fa-solid fa-house"></i><span>No photo</span></div>`}
      <div class="prop-badge ${badgeClass}">${badgeText}</div>
      ${isOwner
          ? `<div class="prop-fav" style="background:var(--coral);color:var(--white)" onclick="event.stopPropagation(); deleteProp('${p.id}')" title="Remove Listing"><i class="fa-solid fa-trash"></i></div>`
          : `<div class="prop-fav ${isFav ? "faved" : ""}" onclick="toggleFav(event,'${p.id}')"><i class="fa-${isFav ? "solid" : "regular"} fa-heart"></i></div>`
        }
    </div>
    <div class="prop-body">
      <div class="prop-type-chip">${typeLabel(p.type)}</div>
      <div class="prop-title">${p.title}</div>
      <div class="prop-loc"><i class="fa-solid fa-location-dot"></i>${p.area}, ${p.district}, ${p.state}</div>
      <div class="prop-meta">
        ${p.rooms ? `<div class="prop-meta-item"><i class="fa-solid fa-bed"></i>${p.rooms} Room${p.rooms > 1 ? "s" : ""}</div>` : ""}
        ${p.bathrooms ? `<div class="prop-meta-item"><i class="fa-solid fa-shower"></i>${p.bathrooms} Bath</div>` : ""}
        <div class="prop-meta-item"><i class="fa-solid fa-ruler-combined"></i>${p.areaSqft} sqft</div>
        <div class="prop-meta-item"><i class="fa-solid fa-eye"></i>${p.views} views</div>
      </div>
      <div class="prop-footer">
        <div><div class="prop-price">${price}${p.isForRent ? `<span>/month</span>` : ""}</div></div>
        <div class="prop-for">${forWhomLabel(p.forWhom)}</div>
      </div>
    </div>
  </div>`;
    }

    function buildTenantSaved() {
      const saved = DB.getProperties().filter((p) =>
        favProperties.includes(p.id),
      );
      return `<div class="section-header"><div><div class="section-title">Saved Properties</div><div class="section-subtitle">${saved.length} saved listing${saved.length !== 1 ? "s" : ""}</div></div></div>
  ${saved.length
          ? `<div class="prop-grid">${saved.map((p) => buildPropCard(p)).join("")}</div>`
          : `<div class="empty-state"><i class="fa-regular fa-heart"></i><h3>No saved properties</h3><p>Browse listings and tap the heart icon to save</p></div>`
        }`;
    }

    function buildTenantInquiries() {
      const inqs = DB.getInquiries().filter(
        (i) => i.tenantId === currentUser.id,
      );
      const props = DB.getProperties();
      return `<div class="section-header"><div><div class="section-title">My Inquiries</div><div class="section-subtitle">${inqs.length} sent</div></div></div>
  ${inqs.length
          ? `<div class="table-wrap"><table><thead><tr><th>Property</th><th>Location</th><th>Rent</th><th>Date</th><th>Status</th></tr></thead><tbody>
  ${inqs
            .map((i) => {
              const p = props.find((pr) => pr.id === i.propId);
              return p
                ? `<tr><td><b>${p.title}</b></td><td>${p.area}, ${p.district}</td><td>${fmt(p.rent)}/mo</td><td>${i.date}</td><td><span class="status-pill status-${i.status || "pending"}">${(i.status || "pending").toUpperCase()}</span></td></tr>`
                : "";
            })
            .join("")}
  </tbody></table></div>`
          : `<div class="empty-state"><i class="fa-solid fa-paper-plane"></i><h3>No inquiries yet</h3><p>Open any property and click "Send Inquiry" to contact owners</p></div>`
        }`;
    }

    function bindSearchEvents() { }

    function onStateChange() {
      const v = document.getElementById("ss-state").value;
      tenantState.state = v;
      tenantState.district = "";
      tenantState.area = "";
      renderTenantContent();
    }
    function onDistrictChange() {
      const v = document.getElementById("ss-district").value;
      tenantState.district = v;
      tenantState.area = "";
      renderTenantContent();
    }
    function setFilter(key, val) {
      tenantState[key] = val;
      document.getElementById("propResults").innerHTML = renderPropGrid();
      document.querySelectorAll(".filter-pill").forEach((p) => {
        if (
          p.getAttribute("onclick") &&
          p.getAttribute("onclick").includes(val)
        ) {
          p.classList.add("active");
        } else if (
          p.getAttribute("onclick") &&
          p.getAttribute("onclick").includes(`'${key}'`)
        ) {
          p.classList.remove("active");
        }
      });
    }
    function applySearch() {
      tenantState.area = document.getElementById("ss-area")?.value || "";
      document.getElementById("propResults").innerHTML = renderPropGrid();
    }
    function toggleFav(e, id) {
      e.stopPropagation();
      const i = favProperties.indexOf(id);
      if (i >= 0) favProperties.splice(i, 1);
      else favProperties.push(id);
      const el = e.currentTarget;
      el.className = `prop-fav ${favProperties.includes(id) ? "faved" : ""}`;
      el.innerHTML = `<i class="fa-${favProperties.includes(id) ? "solid" : "regular"} fa-heart"></i>`;
      toast(
        favProperties.includes(id)
          ? "Added to saved ❤️"
          : "Removed from saved",
        "info",
      );
    }

    // ============================================================
    // PROPERTY DETAIL MODAL
    // ============================================================
    function openPropDetail(id) {
      const p = DB.getProperties().find((pr) => pr.id === id);
      if (!p) return;
      p.views = (p.views || 0) + 1;
      const props = DB.getProperties();
      const idx = props.findIndex((pr) => pr.id === id);
      if (idx >= 0) {
        props[idx] = p;
        DB.saveProperties(props);
      }
      document.getElementById("detailModalTitle").textContent = p.title;
      const owner = DB.getUsers().find((u) => u.id === p.ownerId);
      document.getElementById("detailModalBody").innerHTML = `
  <div class="detail-img-grid">
    <div class="detail-img-main">
      ${p.photos && p.photos[0] ? `<img src="${p.photos[0]}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentNode.innerHTML='<div class=prop-img-placeholder style=height:100%><i class=fa-solid\ fa-house style=font-size:60px></i></div>'">` : `<div class="prop-img-placeholder" style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:rgba(255,255,255,.3)"><i class="fa-solid fa-house" style="font-size:60px"></i></div>`}
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="background:var(--cream2);border-radius:12px;flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:var(--txt3)">
        <i class="fa-solid fa-location-dot" style="font-size:32px;color:var(--gold3)"></i>
        <div style="font-size:13px;font-weight:600;color:var(--navy);text-align:center">${p.area}<br>${p.district}, ${p.state}</div>
      </div>
      <div style="background:${p.isForSale ? "rgba(232,72,85,.1)" : "rgba(16,185,129,.1)"};border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:12px;color:var(--txt2);margin-bottom:4px">${p.isForSale ? "Sale Price" : "Monthly Rent"}</div>
        <div style="font-size:28px;font-weight:700;font-family:'Playfair Display',serif;color:${p.isForSale ? "var(--coral)" : "var(--green)"}">${p.isForSale ? fmt(p.sellPrice) : fmt(p.rent)}</div>
        ${p.isForRent ? `<div style="font-size:11px;color:var(--txt3)">per month</div>` : ""}
      </div>
    </div>
  </div>
  <div class="detail-info-grid">
    <div class="detail-info-item"><div class="dii-label">Property Type</div><div class="dii-val">${typeLabel(p.type)}</div></div>
    ${p.rooms ? `<div class="detail-info-item"><div class="dii-label">Rooms</div><div class="dii-val">${p.rooms} Room${p.rooms > 1 ? "s" : ""}</div></div>` : ""}
    ${p.bathrooms ? `<div class="detail-info-item"><div class="dii-label">Bathrooms</div><div class="dii-val">${p.bathrooms}</div></div>` : ""}
    <div class="detail-info-item"><div class="dii-label">Area</div><div class="dii-val">${p.areaSqft} sq.ft.</div></div>
    <div class="detail-info-item"><div class="dii-label">Suitable For</div><div class="dii-val">${forWhomLabel(p.forWhom)}</div></div>
    <div class="detail-info-item"><div class="dii-label">Views</div><div class="dii-val">${p.views}</div></div>
  </div>
  <p style="font-size:14px;color:var(--txt2);line-height:1.7;margin-bottom:20px">${p.desc}</p>
  ${p.facilities && p.facilities.length ? `<div style="margin-bottom:20px"><div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:10px"><i class="fa-solid fa-star" style="color:var(--gold3)"></i> Facilities</div><div>${p.facilities.map((f) => `<span class="facility-tag"><i class="fa-solid fa-check" style="color:var(--green);font-size:11px"></i>${f}</span>`).join("")}</div></div>` : ""}
  ${p.nearbyMess && p.nearbyMess.length ? `<div style="margin-bottom:16px"><div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:10px"><i class="fa-solid fa-utensils" style="color:var(--gold3)"></i> Nearby Mess / Dhaba</div>${p.nearbyMess.map((m) => `<div class="nearby-item"><i class="fa-solid fa-utensils" style="background:rgba(245,166,35,.12);color:var(--gold3);padding:8px;border-radius:8px"></i><span style="font-size:13px">${m}</span></div>`).join("")}</div>` : ""}
  ${p.nearbyBus && p.nearbyBus.length ? `<div style="margin-bottom:16px"><div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:10px"><i class="fa-solid fa-bus" style="color:var(--gold3)"></i> Nearby Bus Stops</div>${p.nearbyBus.map((b) => `<div class="nearby-item"><i class="fa-solid fa-bus" style="background:rgba(13,27,42,.08);color:var(--navy);padding:8px;border-radius:8px"></i><span style="font-size:13px">${b}</span></div>`).join("")}</div>` : ""}
  ${owner
          ? `<div style="background:var(--cream2);border-radius:12px;padding:16px;display:flex;align-items:center;gap:14px;margin-bottom:16px">
    <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold3));display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--navy);font-size:18px">${owner.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .substring(0, 2)}</div>
    <div><div style="font-weight:600;color:var(--navy)">${owner.name}</div><div style="font-size:13px;color:var(--txt2)"><i class="fa-solid fa-phone" style="font-size:11px"></i> ${owner.phone}</div><div style="font-size:13px;color:var(--txt2)"><i class="fa-solid fa-envelope" style="font-size:11px"></i> ${owner.email}</div></div>
  </div>`
          : ""
        }
  <div style="margin-bottom:16px">
    <div class="map-header"><i class="fa-solid fa-map-location-dot"></i> Live Location on Google Maps</div>
    <div class="map-wrap">
      <iframe
        src="https://maps.google.com/maps?q=${encodeURIComponent(p.area + ", " + p.district + ", " + p.state + ", India")}&output=embed&z=14"
        allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade">
      </iframe>
    </div>
    <a class="map-open-btn" href="https://www.google.com/maps/search/${encodeURIComponent(p.area + ", " + p.district + ", " + p.state + ", India")}" target="_blank" rel="noopener">
      <i class="fa-solid fa-arrow-up-right-from-square"></i> Open in Google Maps
    </a>
  </div>
  <div style="display:flex;gap:10px">
    ${!currentUser || currentUser.role === "tenant"
          ? `
    <button class="btn btn-gold" style="flex:1" onclick="openPayModal('${p.id}','${p.isForSale ? "buy" : "rent"}')"><i class="fa-solid fa-${p.isForSale ? "handshake" : "credit-card"}"></i> ${p.isForSale ? "Buy Property" : "Pay Rent"}</button>
    <button class="btn btn-navy" onclick="sendInquiry('${p.id}')"><i class="fa-solid fa-paper-plane"></i> Inquire</button>
    `
          : currentUser.id === p.ownerId
            ? `<button class="btn" style="flex:1;background:var(--coral);color:var(--white)" onclick="deleteProp('${p.id}'); closeModal('propDetailModal')"><i class="fa-solid fa-trash"></i> Remove Listing</button>`
            : `<button class="btn btn-gold" style="flex:1" onclick="sendInquiry('${p.id}')"><i class="fa-solid fa-paper-plane"></i> Send Inquiry</button>`
        }
    <button class="btn btn-ghost" onclick="closeModal('propDetailModal')">Close</button>
  </div>`;
      openModal("propDetailModal");
    }

    function sendInquiry(propId) {
      if (!currentUser) {
        toast("Please login to send inquiry", "error");
        return;
      }
      if (currentUser.role === "owner") {
        toast("Please login as tenant to send inquiry", "error");
        return;
      }
      const inqs = DB.getInquiries();
      if (
        inqs.find((i) => i.propId === propId && i.tenantId === currentUser.id)
      ) {
        toast("Inquiry already sent!", "info");
        return;
      }
      const prop = DB.getProperties().find((p) => p.id === propId);
      inqs.push({
        id: "inq" + Date.now(),
        propId,
        ownerId: prop ? prop.ownerId : null,
        tenantId: currentUser.id,
        tenantName: currentUser.name,
        tenantPhone: currentUser.phone || "",
        tenantEmail: currentUser.email || "",
        propTitle: prop ? prop.title : "",
        date: new Date().toISOString().split("T")[0],
        status: "pending",
      });
      DB.saveInquiries(inqs);
      toast("Inquiry sent to owner! 📬");
      closeModal("propDetailModal");
    }

    // ============================================================
    // OWNER DASHBOARD
    // ============================================================
    function renderOwner() {
      buildNavbar(document.getElementById("ownerNavbar"), "owner");
      document.getElementById("ownerSidebar").innerHTML = buildSidebarOwner();
      renderOwnerContent();
    }
    function setOwnerView(v) {
      currentOwnerView = v;
      buildNavbar(document.getElementById("ownerNavbar"), "owner");
      document.getElementById("ownerSidebar").innerHTML = buildSidebarOwner();
      renderOwnerContent();
    }
    function renderOwnerContent() {
      const mc = document.getElementById("ownerMainContent");
      if (currentOwnerView === "dashboard")
        mc.innerHTML = buildOwnerDashboard();
      else if (currentOwnerView === "myprops")
        mc.innerHTML = buildOwnerProps();
      else if (currentOwnerView === "payments")
        mc.innerHTML = buildOwnerRentTracker();
    }

    function buildOwnerDashboard() {
      const myProps = DB.getProperties().filter(
        (p) => p.ownerId === currentUser.id,
      );
      const inqs = DB.getInquiries();
      const myInqs = inqs.filter((i) =>
        myProps.find((p) => p.id === i.propId),
      );
      const totalViews = myProps.reduce((a, p) => a + (p.views || 0), 0);
      const activeProps = myProps.filter((p) => p.status === "active").length;
      return `
  <div class="owner-hero">
    <h2>Welcome back, ${currentUser.name.split(" ")[0]}! 👋</h2>
    <p>Manage your properties and track inquiries from one place</p>
    <button class="btn btn-gold" onclick="openAddPropModal()"><i class="fa-solid fa-plus"></i> Add New Listing</button>
  </div>
  <div class="stat-grid">
    <div class="stat-card sc-gold"><div class="stat-icon"><i class="fa-solid fa-house"></i></div><div class="stat-val">${myProps.length}</div><div class="stat-label">Total Listings</div></div>
    <div class="stat-card sc-green"><div class="stat-icon"><i class="fa-solid fa-circle-check"></i></div><div class="stat-val">${activeProps}</div><div class="stat-label">Active Listings</div></div>
    <div class="stat-card sc-coral"><div class="stat-icon"><i class="fa-solid fa-paper-plane"></i></div><div class="stat-val">${myInqs.length}</div><div class="stat-label">Total Inquiries</div></div>
    <div class="stat-card sc-purple"><div class="stat-icon"><i class="fa-solid fa-eye"></i></div><div class="stat-val">${totalViews}</div><div class="stat-label">Total Views</div></div>
  </div>
  <div class="section-header"><div class="section-title">My Listings</div><button class="btn btn-gold" onclick="openAddPropModal()"><i class="fa-solid fa-plus"></i> Add Listing</button></div>
  ${buildOwnerPropsTable(myProps)}
  <div class="section-header" style="margin-top:28px"><div class="section-title">Recent Inquiries</div></div>
  ${buildOwnerInquiriesTable(myInqs, myProps)}`;
    }

    function buildOwnerPropsTable(props) {
      if (!props.length)
        return `<div class="empty-state"><i class="fa-solid fa-house-circle-exclamation"></i><h3>No listings yet</h3><p>Add your first property listing</p><button class="btn btn-gold" onclick="openAddPropModal()"><i class="fa-solid fa-plus"></i> Add Listing</button></div>`;
      return `<div class="table-wrap"><table><thead><tr><th>Property</th><th>Location</th><th>Type</th><th>Price</th><th>Views</th><th>Status</th><th>Actions</th></tr></thead><tbody>
  ${props
          .map(
            (p) => `<tr>
    <td><b style="font-size:13px">${p.title.substring(0, 30)}${p.title.length > 30 ? "…" : ""}</b></td>
    <td style="font-size:13px">${p.area}, ${p.district}</td>
    <td><span class="status-pill" style="background:var(--cream2);color:var(--txt)">${typeLabel(p.type)}</span></td>
    <td><b>${p.isForSale ? fmt(p.sellPrice) : fmt(p.rent) + "/mo"}</b></td>
    <td>${p.views || 0}</td>
    <td><span class="status-pill status-${p.status}">${p.status.toUpperCase()}</span></td>
    <td style="display:flex;gap:6px">
      <button class="action-btn btn-sm-gold" onclick="openPropDetail('${p.id}')">View</button>
      <button class="action-btn btn-sm-red" onclick="deleteProp('${p.id}')">Delete</button>
    </td>
  </tr>`,
          )
          .join("")}
  </tbody></table></div>`;
    }

    function buildOwnerInquiriesTable(inqs, myProps) {
      if (!inqs.length)
        return `<div class="empty-state" style="padding:30px"><i class="fa-solid fa-inbox"></i><h3>No inquiries yet</h3><p>Inquiries from tenants will appear here automatically</p></div>`;
      const users = DB.getUsers();
      return `<div class="table-wrap"><table><thead><tr><th>Tenant</th><th>Contact</th><th>Property</th><th>Date</th><th>Status</th><th>Action</th></tr></thead><tbody>
  ${inqs
          .map((i) => {
            // Prefer embedded fields (new), fall back to user lookup (legacy)
            const t = users.find((u) => u.id === i.tenantId);
            const tenantName = i.tenantName || (t ? t.name : "Unknown");
            const tenantPhone = i.tenantPhone || (t ? t.phone : "");
            const tenantEmail = i.tenantEmail || (t ? t.email : "");
            const p = myProps.find((pr) => pr.id === i.propId);
            const propTitle = i.propTitle || (p ? p.title : "—");
            return `<tr><td><b style="font-size:13px">${tenantName}</b></td>
    <td style="font-size:12px;color:var(--txt2)">${tenantPhone ? `<i class="fa-solid fa-phone" style="font-size:10px"></i> ${tenantPhone}<br>` : ""}${tenantEmail ? `<i class="fa-solid fa-envelope" style="font-size:10px"></i> ${tenantEmail}` : ""}</td>
    <td style="font-size:13px">${propTitle.substring(0, 25)}${propTitle.length > 25 ? "…" : ""}</td>
    <td style="font-size:13px">${i.date}</td>
    <td><span class="status-pill status-${i.status || "pending"}">${(i.status || "pending").toUpperCase()}</span></td>
    <td style="display:flex;gap:6px">
      <button class="action-btn btn-sm-green" onclick="updateInquiry('${i.id}','active')">Accept</button>
      <button class="action-btn btn-sm-red" onclick="updateInquiry('${i.id}','inactive')">Reject</button>
    </td></tr>`;
          })
          .join("")}
  </tbody></table></div>`;
    }

    function buildOwnerProps() {
      const myProps = DB.getProperties().filter(
        (p) => p.ownerId === currentUser.id,
      );
      return `<div class="section-header"><div><div class="section-title">All My Listings</div><div class="section-subtitle">${myProps.length} properties listed</div></div><button class="btn btn-gold" onclick="openAddPropModal()"><i class="fa-solid fa-plus"></i> Add Listing</button></div>
  ${myProps.length
          ? `<div class="prop-grid">${myProps.map((p) => buildPropCard(p)).join("")}</div>`
          : `<div class="empty-state"><i class="fa-solid fa-house-circle-exclamation"></i><h3>No listings yet</h3><p>Start by adding your first property</p><button class="btn btn-gold" onclick="openAddPropModal()"><i class="fa-solid fa-plus"></i> Add Listing</button></div>`
        }`;
    }

    function deleteProp(id) {
      if (!confirm("Delete this property?")) return;
      const props = DB.getProperties().filter((p) => p.id !== id);
      DB.saveProperties(props);
      toast("Property deleted", "info");
      renderOwnerContent();
    }

    function updateInquiry(id, status) {
      const inqs = DB.getInquiries();
      const i = inqs.findIndex((x) => x.id === id);
      if (i >= 0) {
        inqs[i].status = status;
        DB.saveInquiries(inqs);
      }
      toast(
        status === "active" ? "Inquiry accepted ✅" : "Inquiry rejected",
        "info",
      );
      renderOwnerContent();
    }

    // ============================================================
    // ADD PROPERTY MODAL
    // ============================================================
    function openAddPropModal() {
      const states = Object.keys(INDIA_GEO).sort();
      document.getElementById("addPropBody").innerHTML = `
  <div class="form-section">
    <div class="form-section-title"><i class="fa-solid fa-tag"></i> Basic Information</div>
    <div class="field-group"><label class="field-label">Property Title *</label><input class="field-input" id="ap-title" placeholder="e.g. Spacious 2BHK near IT Park"></div>
    <div class="form-grid-2">
      <div class="field-group"><label class="field-label">Property Type *</label>
        <select class="field-select" id="ap-type">
          <option value="house">🏠 House / Flat</option>
          <option value="room">🛏 Private Room</option>
          <option value="hostel">🏨 Hostel / PG</option>
          <option value="land">🌿 Land / Plot</option>
        </select>
      </div>
      <div class="field-group"><label class="field-label">Listing Purpose *</label>
        <select class="field-select" id="ap-purpose">
          <option value="rent">For Rent</option>
          <option value="sell">For Sale</option>
          <option value="both">Both</option>
        </select>
      </div>
    </div>
    <div class="field-group"><label class="field-label">Description</label><textarea class="field-textarea" id="ap-desc" placeholder="Describe your property in detail…"></textarea></div>
  </div>
  <div class="form-section">
    <div class="form-section-title"><i class="fa-solid fa-location-dot"></i> Location</div>
    <div class="form-grid-3">
      <div class="field-group"><label class="field-label">State *</label>
        <select class="field-select" id="ap-state" onchange="onAPStateChange()">
          <option value="">Select State</option>
          ${states.map((s) => `<option value="${s}">${s}</option>`).join("")}
        </select>
      </div>
      <div class="field-group"><label class="field-label">District *</label>
        <select class="field-select" id="ap-district" onchange="onAPDistrictChange()"><option value="">Select District</option></select>
      </div>
      <div class="field-group"><label class="field-label">Area *</label>
        <select class="field-select" id="ap-area"><option value="">Select Area</option></select>
      </div>
    </div>
  </div>
  <div class="form-section">
    <div class="form-section-title"><i class="fa-solid fa-ruler"></i> Property Details</div>
    <div class="form-grid-3">
      <div class="field-group"><label class="field-label">No. of Rooms</label><input type="number" class="field-input" id="ap-rooms" placeholder="2" min="0"></div>
      <div class="field-group"><label class="field-label">Bathrooms</label><input type="number" class="field-input" id="ap-bath" placeholder="1" min="0"></div>
      <div class="field-group"><label class="field-label">Area (sq.ft)</label><input type="number" class="field-input" id="ap-sqft" placeholder="800" min="0"></div>
    </div>
    <div class="form-grid-2">
      <div class="field-group"><label class="field-label">Monthly Rent (₹)</label><input type="number" class="field-input" id="ap-rent" placeholder="15000" min="0"></div>
      <div class="field-group"><label class="field-label">Sale Price (₹)</label><input type="number" class="field-input" id="ap-sell" placeholder="5000000" min="0"></div>
    </div>
    <div class="field-group"><label class="field-label">Suitable For</label>
      <select class="field-select" id="ap-for">
        <option value="all">Anyone</option>
        <option value="family">Family</option>
        <option value="students">Students</option>
        <option value="boys">Boys Only</option>
        <option value="girls">Girls Only</option>
      </select>
    </div>
  </div>
  <div class="form-section">
    <div class="form-section-title"><i class="fa-solid fa-star"></i> Facilities</div>
    <div class="checkbox-group">
      ${[
          "WiFi",
          "AC",
          "Parking",
          "Geyser",
          "Power Backup",
          "Security",
          "CCTV",
          "Gym",
          "Swimming Pool",
          "Garden",
          "Lift",
          "Washing Machine",
          "Kitchen",
          "Meals Included",
          "Furnished",
          "Study Room",
          "Laundry",
        ]
          .map(
            (f) => `
        <label class="checkbox-pill"><input type="checkbox" value="${f}" name="ap-facility"> ${f}</label>
      `,
          )
          .join("")}
    </div>
  </div>
  <div class="form-section">
    <div class="form-section-title"><i class="fa-solid fa-utensils"></i> Nearby Amenities</div>
    <div class="form-grid-2">
      <div class="field-group"><label class="field-label">Nearby Mess (one per line)</label><textarea class="field-textarea" id="ap-mess" placeholder="Sharma Dhaba - 200m&#10;Veg Paradise - 500m" style="min-height:70px"></textarea></div>
      <div class="field-group"><label class="field-label">Nearby Bus Stops (one per line)</label><textarea class="field-textarea" id="ap-bus" placeholder="Main Bus Stop - 100m&#10;Depot Road - 500m" style="min-height:70px"></textarea></div>
    </div>
  </div>
  <div class="form-section">
    <div class="form-section-title"><i class="fa-solid fa-image"></i> Property Photo</div>
    <div class="field-group">
      <label class="field-label">Upload Photo</label>
      <input type="file" class="field-input" id="ap-photo-file" accept="image/*" onchange="handlePhotoUpload(this)" style="padding:10px">
      <input type="hidden" id="ap-photo-data">
      <div id="ap-photo-preview" style="margin-top:10px;display:none;">
         <img src="" style="max-width:100%;max-height:200px;border-radius:var(--radius);border:1px solid var(--cream3)">
      </div>
    </div>
    <div class="field-group" style="margin-top:15px">
      <label class="field-label">Or Enter Photo URL</label>
      <input class="field-input" id="ap-photo-url" placeholder="https://example.com/photo.jpg">
    </div>
  </div>
  <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:10px">
    <button class="btn btn-ghost" onclick="closeModal('addPropModal')">Cancel</button>
    <button class="btn btn-gold" onclick="submitAddProp()"><i class="fa-solid fa-check"></i> List Property</button>
  </div>`;
      openModal("addPropModal");
    }

    function onAPStateChange() {
      const s = document.getElementById("ap-state").value;
      const d = document.getElementById("ap-district");
      d.innerHTML = '<option value="">Select District</option>';
      if (s && INDIA_GEO[s]) {
        INDIA_GEO[s].forEach((dist) => {
          const o = document.createElement("option");
          o.value = o.textContent = dist;
          d.appendChild(o);
        });
      }
      document.getElementById("ap-area").innerHTML =
        '<option value="">Select Area</option>';
    }
    function onAPDistrictChange() {
      const dist = document.getElementById("ap-district").value;
      const a = document.getElementById("ap-area");
      a.innerHTML = '<option value="">Select Area</option>';
      getAreas(dist).forEach((ar) => {
        const o = document.createElement("option");
        o.value = o.textContent = ar;
        a.appendChild(o);
      });
    }

    function handlePhotoUpload(input) {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

          const hiddenInput = document.getElementById('ap-photo-data');
          if (hiddenInput) hiddenInput.value = dataUrl;
          const preview = document.getElementById('ap-photo-preview');
          if (preview) {
            preview.style.display = 'block';
            preview.querySelector('img').src = dataUrl;
          }
        }
        img.src = e.target.result;
      }
      reader.readAsDataURL(file);
    }

    function submitAddProp() {
      const title = document.getElementById("ap-title").value.trim();
      const state = document.getElementById("ap-state").value;
      const district = document.getElementById("ap-district").value;
      const area = document.getElementById("ap-area").value;
      const type = document.getElementById("ap-type").value;
      const purpose = document.getElementById("ap-purpose").value;
      const rent = parseInt(document.getElementById("ap-rent").value) || null;
      const sell = parseInt(document.getElementById("ap-sell").value) || null;
      if (!title || !state || !district) {
        toast(
          "Please fill in required fields (title, state, district)",
          "error",
        );
        return;
      }
      const facilities = [
        ...document.querySelectorAll('input[name="ap-facility"]:checked'),
      ].map((c) => c.value);
      const nearbyMess = document
        .getElementById("ap-mess")
        .value.split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const nearbyBus = document
        .getElementById("ap-bus")
        .value.split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const uploadedPhoto = document.getElementById("ap-photo-data") ? document.getElementById("ap-photo-data").value : "";
      const photoUrlInput = document.getElementById("ap-photo-url") ? document.getElementById("ap-photo-url").value.trim() : "";
      const oldPhotoUrl = document.getElementById("ap-photo") ? document.getElementById("ap-photo").value.trim() : "";
      const photoUrl = uploadedPhoto || photoUrlInput || oldPhotoUrl;

      const newProp = {
        id: "p" + Date.now(),
        ownerId: currentUser.id,
        type,
        title,
        desc: document.getElementById("ap-desc").value.trim(),
        state,
        district,
        area: area || "Other",
        rent,
        sellPrice: sell,
        isForRent: purpose === "rent" || purpose === "both",
        isForSale: purpose === "sell" || purpose === "both",
        forWhom: document.getElementById("ap-for").value,
        rooms: parseInt(document.getElementById("ap-rooms").value) || 0,
        bathrooms: parseInt(document.getElementById("ap-bath").value) || 0,
        areaSqft: parseInt(document.getElementById("ap-sqft").value) || 0,
        facilities,
        nearbyMess,
        nearbyBus,
        photos: photoUrl ? [photoUrl] : [],
        status: "active",
        createdAt: new Date().toISOString().split("T")[0],
        views: 0,
        inquiries: 0,
      };
      const props = DB.getProperties();
      props.push(newProp);
      DB.saveProperties(props);
      closeModal("addPropModal");
      toast("Property listed successfully! 🏠 Tenants can now see it");
      setOwnerView("myprops");
    }

    // ============================================================
    // ADMIN DASHBOARD
    // ============================================================
    function renderAdmin() {
      buildNavbar(document.getElementById("adminNavbar"), "admin");
      document.getElementById("adminSidebar").innerHTML = buildSidebarAdmin();
      renderAdminContent();
    }
    function setAdminView(v) {
      currentAdminView = v;
      buildNavbar(document.getElementById("adminNavbar"), "admin");
      document.getElementById("adminSidebar").innerHTML = buildSidebarAdmin();
      renderAdminContent();
    }
    function renderAdminContent() {
      const mc = document.getElementById("adminMainContent");
      if (currentAdminView === "dashboard")
        mc.innerHTML = buildAdminDashboard();
      else if (currentAdminView === "users") mc.innerHTML = buildAdminUsers();
      else mc.innerHTML = buildAdminProps();
    }

    function buildAdminDashboard() {
      const users = DB.getUsers();
      const props = DB.getProperties();
      const inqs = DB.getInquiries();
      const tenants = users.filter((u) => u.role === "tenant").length;
      const owners = users.filter((u) => u.role === "owner").length;
      const active = props.filter((p) => p.status === "active").length;
      const totalViews = props.reduce((a, p) => a + (p.views || 0), 0);
      const byType = { house: 0, room: 0, hostel: 0, land: 0 };
      props.forEach((p) => (byType[p.type] = (byType[p.type] || 0) + 1));
      const byState = {};
      props.forEach((p) => (byState[p.state] = (byState[p.state] || 0) + 1));
      const topStates = Object.entries(byState)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      return `
  <div class="section-header"><div><div class="section-title">Admin Dashboard</div><div class="section-subtitle">Platform overview and management</div></div></div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px">
    <div class="stat-card sc-gold"><div class="stat-icon"><i class="fa-solid fa-users"></i></div><div class="stat-val">${users.length}</div><div class="stat-label">Total Users</div></div>
    <div class="stat-card sc-green"><div class="stat-icon"><i class="fa-solid fa-house"></i></div><div class="stat-val">${active}</div><div class="stat-label">Active Listings</div></div>
    <div class="stat-card sc-coral"><div class="stat-icon"><i class="fa-solid fa-paper-plane"></i></div><div class="stat-val">${inqs.length}</div><div class="stat-label">Inquiries</div></div>
    <div class="stat-card sc-purple"><div class="stat-icon"><i class="fa-solid fa-eye"></i></div><div class="stat-val">${totalViews}</div><div class="stat-label">Total Views</div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px">
    <div style="background:var(--white);border-radius:var(--radius);padding:20px;border:1px solid var(--cream3)">
      <div style="font-weight:700;color:var(--navy);margin-bottom:16px;font-size:15px"><i class="fa-solid fa-chart-pie" style="color:var(--gold3)"></i> Properties by Type</div>
      ${Object.entries(byType)
          .map(([t, n]) => {
            const pct = props.length ? Math.round((n / props.length) * 100) : 0;
            return `<div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>${typeLabel(t)}</span><b>${n}</b></div>
          <div style="background:var(--cream2);border-radius:4px;height:8px"><div style="background:var(--gold);height:8px;border-radius:4px;width:${pct}%;transition:.5s"></div></div>
        </div>`;
          })
          .join("")}
    </div>
    <div style="background:var(--white);border-radius:var(--radius);padding:20px;border:1px solid var(--cream3)">
      <div style="font-weight:700;color:var(--navy);margin-bottom:16px;font-size:15px"><i class="fa-solid fa-map-location-dot" style="color:var(--gold3)"></i> Top States by Listings</div>
      ${topStates
          .map(([s, n]) => {
            const pct = props.length ? Math.round((n / props.length) * 100) : 0;
            return `<div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>${s}</span><b>${n}</b></div>
          <div style="background:var(--cream2);border-radius:4px;height:8px"><div style="background:var(--navy);height:8px;border-radius:4px;width:${pct}%;transition:.5s"></div></div>
        </div>`;
          })
          .join("")}
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div><div class="section-header"><div class="section-title" style="font-size:18px">Recent Users</div></div>
    <div class="table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Joined</th></tr></thead><tbody>
    ${users
          .slice(-5)
          .reverse()
          .map(
            (u) =>
              `<tr><td><b style="font-size:13px">${u.name}</b><br><span style="font-size:11px;color:var(--txt3)">${u.email}</span></td><td><span class="status-pill" style="background:${u.role === "admin" ? "rgba(124,58,237,.12)" : u.role === "owner" ? "rgba(245,166,35,.12)" : "rgba(16,185,129,.12)"};color:${u.role === "admin" ? "var(--purple)" : u.role === "owner" ? "var(--gold3)" : "var(--green)"}">${u.role.toUpperCase()}</span></td><td style="font-size:12px">${u.createdAt}</td></tr>`,
          )
          .join("")}
    </tbody></table></div></div>
    <div><div class="section-header"><div class="section-title" style="font-size:18px">Recent Listings</div></div>
    <div class="table-wrap"><table><thead><tr><th>Property</th><th>Price</th><th>Status</th></tr></thead><tbody>
    ${props
          .slice(-5)
          .reverse()
          .map(
            (p) =>
              `<tr><td><b style="font-size:13px">${p.title.substring(0, 22)}…</b><br><span style="font-size:11px;color:var(--txt3)">${p.area}, ${p.state}</span></td><td style="font-size:13px"><b>${p.isForSale ? fmt(p.sellPrice) : fmt(p.rent) + "/mo"}</b></td><td><span class="status-pill status-${p.status}">${p.status.toUpperCase()}</span></td></tr>`,
          )
          .join("")}
    </tbody></table></div></div>
  </div>`;
    }

    function buildAdminUsers() {
      const users = DB.getUsers();
      return `<div class="section-header"><div><div class="section-title">All Users</div><div class="section-subtitle">${users.length} registered users</div></div></div>
  <div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead><tbody>
  ${users
          .map(
            (u) => `<tr>
    <td><b>${u.name}</b></td>
    <td style="font-size:13px">${u.email}</td>
    <td style="font-size:13px">${u.phone}</td>
    <td><span class="status-pill" style="background:${u.role === "admin" ? "rgba(124,58,237,.12)" : u.role === "owner" ? "rgba(245,166,35,.12)" : "rgba(16,185,129,.12)"};color:${u.role === "admin" ? "var(--purple)" : u.role === "owner" ? "var(--gold3)" : "var(--green)"}">${u.role.toUpperCase()}</span></td>
    <td style="font-size:12px">${u.createdAt}</td>
    <td>${u.role !== "admin" ? `<button class="action-btn btn-sm-red" onclick="adminDeleteUser('${u.id}')">Remove</button>` : ""}</td>
  </tr>`,
          )
          .join("")}
  </tbody></table></div>`;
    }

    function buildAdminProps() {
      const props = DB.getProperties();
      const users = DB.getUsers();
      return `<div class="section-header"><div><div class="section-title">All Properties</div><div class="section-subtitle">${props.length} listings</div></div></div>
  <div class="table-wrap"><table><thead><tr><th>Title</th><th>Owner</th><th>Location</th><th>Type</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>
  ${props
          .map((p) => {
            const owner = users.find((u) => u.id === p.ownerId);
            return `<tr>
      <td><b style="font-size:13px">${p.title.substring(0, 25)}…</b></td>
      <td style="font-size:13px">${owner ? owner.name : "—"}</td>
      <td style="font-size:12px">${p.area}, ${p.state}</td>
      <td style="font-size:12px">${typeLabel(p.type)}</td>
      <td><b style="font-size:13px">${p.isForSale ? fmt(p.sellPrice) : fmt(p.rent) + "/mo"}</b></td>
      <td><span class="status-pill status-${p.status}">${p.status.toUpperCase()}</span></td>
      <td style="display:flex;gap:6px">
        <button class="action-btn btn-sm-gold" onclick="openPropDetail('${p.id}')">View</button>
        <button class="action-btn btn-sm-red" onclick="adminDeleteProp('${p.id}')">Delete</button>
        <button class="action-btn btn-sm-green" onclick="adminToggleProp('${p.id}')">Toggle</button>
      </td>
    </tr>`;
          })
          .join("")}
  </tbody></table></div>`;
    }

    function adminDeleteUser(id) {
      if (!confirm("Remove this user?")) return;
      DB.saveUsers(DB.getUsers().filter((u) => u.id !== id));
      toast("User removed", "info");
      renderAdminContent();
    }
    function adminDeleteProp(id) {
      if (!confirm("Delete this property?")) return;
      DB.saveProperties(DB.getProperties().filter((p) => p.id !== id));
      toast("Property deleted", "info");
      renderAdminContent();
    }
    function adminToggleProp(id) {
      const props = DB.getProperties();
      const i = props.findIndex((p) => p.id === id);
      if (i >= 0) {
        props[i].status =
          props[i].status === "active" ? "inactive" : "active";
        DB.saveProperties(props);
      }
      toast("Status updated");
      renderAdminContent();
    }

    // ============================================================
    // INIT
    // ============================================================

    // ============================================================
    // INIT
    // ============================================================
    window.addEventListener("load", function () {
      // Seed only if DB is empty (never wipes existing users/signups)
      seedData();

      // Re-validate saved session against live DB
      const saved = DB.getCurrentUser();
      if (saved) {
        const liveUser = DB.getUsers().find((u) => u.id === saved.id);
        if (liveUser) {
          currentUser = liveUser;
          initLiveState();
          routeUser(liveUser);
        } else {
          DB.clearCurrentUser();
          showPage("page-login");
        }
      } else {
        showPage("page-login");
      }

      // Avatar menu toggle
      document.addEventListener("click", function (e) {
        const menu = document.getElementById("avatarMenu");
        if (
          !e.target.closest(".nav-avatar") &&
          !e.target.closest("#avatarMenu")
        ) {
          if (menu) menu.classList.add("hidden");
        }
      });
    });

    // ============================================================
    // EXTENDED DB — Transactions
    // ============================================================
    DB.getTransactions = function () {
      return this.get("transactions") || [];
    };
    DB.saveTransactions = function (t) {
      this.set("transactions", t);
    };

    // ============================================================
    // GOOGLE MAPS FULL MODAL
    // ============================================================
    function openMapModal(area, district, state) {
      const q = encodeURIComponent(
        area + ", " + district + ", " + state + ", India",
      );
      document.getElementById("mapModalTitle").innerHTML =
        '<i class="fa-solid fa-map-location-dot" style="color:var(--coral)"></i> &nbsp;' +
        area +
        ", " +
        district;
      document.getElementById("mapModalBody").innerHTML = `
    <iframe src="https://maps.google.com/maps?q=${q}&output=embed&z=15"
      style="width:100%;height:520px;border:none;display:block"
      allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade">
    </iframe>`;
      openModal("mapModal");
    }

    // ============================================================
    // PAYMENT MODAL — open from property detail
    // ============================================================
    let _payPropId = null;
    let _payType = null;
    let _payMethod = "upi";

    function openPayModal(propId, type) {
      const p = DB.getProperties().find((pr) => pr.id === propId);
      if (!p) return;
      if (!currentUser || currentUser.role !== "tenant") {
        toast("Please login as a tenant to make payments", "error");
        return;
      }
      _payPropId = propId;
      _payType = type;
      _payMethod = "upi";
      _payFreq = "monthly";
      closeModal("propDetailModal");

      const amount = type === "buy" ? p.sellPrice : p.rent;
      const isYearly = type === "rent";
      const amtDisp = type === "buy" ? fmt(amount) : fmt(amount);
      const amtYearly = type === "rent" ? fmt(amount * 12) + " /year" : "";

      document.getElementById("payModalTitle").innerHTML =
        `<i class="fa-solid fa-credit-card" style="color:var(--green)"></i> &nbsp;${type === "buy" ? "Purchase Property" : "Pay Rent"}`;

      document.getElementById("payModalBody").innerHTML = `
    <div style="background:var(--cream2);border-radius:12px;padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
      <i class="fa-solid fa-house" style="font-size:22px;color:var(--gold3)"></i>
      <div>
        <div style="font-weight:700;color:var(--navy);font-size:14px">${p.title}</div>
        <div style="font-size:12px;color:var(--txt2)">${p.area}, ${p.district}, ${p.state}</div>
      </div>
    </div>

    ${type === "rent"
          ? `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      <div id="pay-freq-monthly" class="pay-method-card selected" onclick="selectPayFreq('monthly')" style="border-color:var(--gold3);background:rgba(245,166,35,.06)">
        <div class="pm-icon">📅</div><div class="pm-name">Monthly</div>
        <div style="font-size:11px;color:var(--txt2);margin-top:2px">${fmt(amount)}</div>
      </div>
      <div id="pay-freq-yearly" class="pay-method-card" onclick="selectPayFreq('yearly')">
        <div class="pm-icon">📆</div><div class="pm-name">Yearly</div>
        <div style="font-size:11px;color:var(--green);font-weight:700;margin-top:2px">${fmt(amount * 12)} <span style="font-size:9px;background:rgba(16,185,129,.12);padding:1px 6px;border-radius:8px">Save 0%</span></div>
      </div>
    </div>`
          : ""
        }

    <div class="pay-modal-amount">
      <div class="pma-label">${type === "buy" ? "Total Purchase Amount" : "Amount to Pay"}</div>
      <div class="pma-val" id="pay-display-amt">${amtDisp}</div>
      <div class="pma-sub">${type === "buy" ? "One-time payment" : "per month"}</div>
    </div>

    <div style="font-size:12px;font-weight:700;color:var(--txt2);text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px">Select Payment Method</div>
    <div class="pay-method-grid">
      <div class="pay-method-card selected" id="pm-upi" onclick="selectPayMethod('upi')">
        <div class="pm-icon">📱</div><div class="pm-name">UPI</div>
      </div>
      <div class="pay-method-card" id="pm-netbanking" onclick="selectPayMethod('netbanking')">
        <div class="pm-icon">🏦</div><div class="pm-name">Net Banking</div>
      </div>
      <div class="pay-method-card" id="pm-card" onclick="selectPayMethod('card')">
        <div class="pm-icon">💳</div><div class="pm-name">Card</div>
      </div>
    </div>

    <div id="pay-method-fields">
      <div class="lp-field">
        <label class="lp-label">UPI ID</label>
        <div class="lp-iw">
          <i class="fa-solid fa-at lp-il"></i>
          <input class="lp-input" id="pay-upi-id" placeholder="yourname@upi">
        </div>
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-top:16px">
      <button class="pay-btn pay-btn-green" style="flex:1;padding:14px" onclick="submitPayment()">
        <i class="fa-solid fa-lock"></i> Pay Securely — <span id="pay-btn-amt">${amtDisp}</span>
      </button>
      <button class="btn btn-ghost" onclick="closeModal('paymentModal')" style="padding:14px 20px">Cancel</button>
    </div>
    <div style="text-align:center;font-size:11px;color:var(--txt3);margin-top:10px">
      <i class="fa-solid fa-shield-halved" style="color:var(--green)"></i> 256-bit SSL encrypted &nbsp;·&nbsp; Simulated payment (no real charges)
    </div>`;

      openModal("paymentModal");
    }

    let _payFreq = "monthly";
    function selectPayFreq(freq) {
      _payFreq = freq;
      const p = DB.getProperties().find((pr) => pr.id === _payPropId);
      const amt = freq === "yearly" ? p.rent * 12 : p.rent;
      document.getElementById("pay-display-amt").textContent = fmt(amt);
      document.getElementById("pay-btn-amt").textContent = fmt(amt);
      document
        .getElementById("pay-display-amt")
        .parentElement.querySelector(".pma-sub").textContent =
        freq === "yearly" ? "for 12 months" : "per month";
      ["monthly", "yearly"].forEach((f) => {
        const el = document.getElementById("pay-freq-" + f);
        if (el) {
          el.classList.toggle("selected", f === freq);
          el.style.borderColor = f === freq ? "var(--gold3)" : "";
          el.style.background = f === freq ? "rgba(245,166,35,.06)" : "";
        }
      });
    }

    function selectPayMethod(method) {
      _payMethod = method;
      ["upi", "netbanking", "card"].forEach((m) => {
        const el = document.getElementById("pm-" + m);
        if (el) {
          el.classList.toggle("selected", m === method);
        }
      });
      const fields = document.getElementById("pay-method-fields");
      if (!fields) return;
      if (method === "upi") {
        fields.innerHTML = `<div class="lp-field"><label class="lp-label">UPI ID</label><div class="lp-iw"><i class="fa-solid fa-at lp-il"></i><input class="lp-input" id="pay-upi-id" placeholder="yourname@upi"></div></div>`;
      } else if (method === "netbanking") {
        fields.innerHTML = `<div class="lp-field"><label class="lp-label">Bank Account Number</label><div class="lp-iw"><i class="fa-solid fa-building-columns lp-il"></i><input class="lp-input" id="pay-nb-id" placeholder="XXXX XXXX XXXX"></div></div>`;
      } else {
        fields.innerHTML = `
      <div class="lp-field"><label class="lp-label">Card Number</label><div class="lp-iw"><i class="fa-solid fa-credit-card lp-il"></i><input class="lp-input" id="pay-card-id" placeholder="1234 5678 9012 3456"></div></div>
      <div class="signup-form-row">
        <div class="lp-field"><label class="lp-label">Expiry</label><div class="lp-iw"><i class="fa-solid fa-calendar lp-il"></i><input class="lp-input" placeholder="MM/YY"></div></div>
        <div class="lp-field"><label class="lp-label">CVV</label><div class="lp-iw"><i class="fa-solid fa-lock lp-il"></i><input class="lp-input" placeholder="123" type="password"></div></div>
      </div>`;
      }
    }

    function submitPayment() {
      const p = DB.getProperties().find((pr) => pr.id === _payPropId);
      if (!p) return;

      if (_payMethod === "upi") {
        const el = document.getElementById("pay-upi-id");
        if (el && !el.value.trim()) {
          toast("Please enter a valid UPI ID", "error");
          return;
        }
      } else if (_payMethod === "netbanking") {
        const el = document.getElementById("pay-nb-id");
        if (el && !el.value.trim()) {
          toast("Please enter your Bank Account Number", "error");
          return;
        }
      } else if (_payMethod === "card") {
        const el = document.getElementById("pay-card-id");
        if (el && !el.value.trim()) {
          toast("Please enter a valid Card Number", "error");
          return;
        }
      }

      const amount =
        _payType === "buy"
          ? p.sellPrice
          : _payFreq === "yearly"
            ? p.rent * 12
            : p.rent;
      let coveredMonths = [];
      const curDate = new Date();
      if (_payType === "rent") {
        const count = _payFreq === "yearly" ? 12 : 1;
        for (let i = 0; i < count; i++) {
          const d = new Date(
            curDate.getFullYear(),
            curDate.getMonth() + i,
            1,
          );
          coveredMonths.push(
            d.toLocaleString("default", { month: "short" }) +
            " " +
            d.getFullYear(),
          );
        }
      }

      const txns = DB.getTransactions();
      const txn = {
        id: "txn" + Date.now(),
        tenantId: currentUser.id,
        propId: _payPropId,
        ownerId: p.ownerId,
        type: _payType,
        freq: _payFreq,
        amount,
        method: _payMethod,
        date: curDate.toISOString().split("T")[0],
        month:
          curDate.toLocaleString("default", { month: "short" }) +
          " " +
          curDate.getFullYear(),
        coveredMonths: coveredMonths,
        status: "paid",
      };
      txns.push(txn);
      DB.saveTransactions(txns);

      if (_payType === "buy") {
        const props = DB.getProperties();
        const idx = props.findIndex((pr) => pr.id === _payPropId);
        if (idx >= 0) {
          props[idx].status = "sold";
          DB.saveProperties(props);
        }
      }

      closeModal("paymentModal");

      // Celebration
      toast(`Payment of ${fmt(amount)} successful! 🎉`);
      setTimeout(() => {
        toast(`Receipt sent to ${currentUser.email} 📧`, "info");
      }, 1500);

      if (currentUser.role === "tenant") {
        setTimeout(() => {
          setTenantView("transactions");
        }, 2000);
      }
    }

    // ============================================================
    // TENANT TRANSACTIONS VIEW
    // ============================================================
    function buildTenantTransactions() {
      const txns = DB.getTransactions().filter(
        (t) => t.tenantId === currentUser.id,
      );
      const props = DB.getProperties();
      const totalPaid = txns
        .filter((t) => t.status === "paid")
        .reduce((a, t) => a + t.amount, 0);
      const rentPaid = txns
        .filter((t) => t.type === "rent" && t.status === "paid")
        .reduce((a, t) => a + t.amount, 0);
      const purchases = txns.filter((t) => t.type === "buy").length;

      // Group by property for upcoming schedule
      const propIds = [
        ...new Set(
          txns.filter((t) => t.type === "rent").map((t) => t.propId),
        ),
      ];
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const currentMonth = new Date().getMonth();

      return `
  <div class="txn-hero">
    <h2>My Payments</h2>
    <p>Track all your rent payments, purchases and upcoming dues</p>
  </div>

  <div class="txn-card-grid">
    <div class="txn-stat-card ts-green"><div class="ts-icon"><i class="fa-solid fa-circle-check"></i></div><div class="ts-val">${fmt(totalPaid)}</div><div class="ts-lbl">Total Paid</div></div>
    <div class="txn-stat-card ts-gold"><div class="ts-icon"><i class="fa-solid fa-house-circle-check"></i></div><div class="ts-val">${fmt(rentPaid)}</div><div class="ts-lbl">Rent Paid</div></div>
    <div class="txn-stat-card ts-coral"><div class="ts-icon"><i class="fa-solid fa-handshake"></i></div><div class="ts-val">${purchases}</div><div class="ts-lbl">Purchases</div></div>
    <div class="txn-stat-card ts-purple"><div class="ts-icon"><i class="fa-solid fa-receipt"></i></div><div class="ts-val">${txns.length}</div><div class="ts-lbl">Transactions</div></div>
  </div>

  ${propIds.length
          ? `
  <div class="section-header"><div><div class="section-title">Rent Schedule</div><div class="section-subtitle">Monthly payment calendar for active rentals</div></div></div>
  ${propIds
            .map((pid) => {
              const p = props.find((pr) => pr.id === pid);
              if (!p) return "";
              const paidMonths = txns
                .filter((t) => t.propId === pid && t.type === "rent")
                .flatMap((t) => t.coveredMonths || [t.month]);
              return `
    <div class="rent-track-card">
      <div class="rtc-head" style="align-items:flex-start">
        <div style="width:48px;height:48px;border-radius:10px;overflow:hidden;flex-shrink:0;background:var(--cream2);display:flex;align-items:center;justify-content:center;margin-right:12px">
          ${p.photos && p.photos[0] ? `<img src="${p.photos[0]}" style="width:100%;height:100%;object-fit:cover">` : `<i class="fa-solid fa-house" style="color:var(--txt3);font-size:18px"></i>`}
        </div>
        <div style="flex:1"><div class="rtc-prop">${p.title}</div><div class="rtc-loc"><i class="fa-solid fa-location-dot" style="color:var(--gold3);font-size:11px"></i> ${p.area}, ${p.district}</div></div>
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--txt3);margin-bottom:2px">Monthly</div>
          <div style="font-size:18px;font-weight:700;color:var(--green)">${fmt(p.rent)}</div>
          <button class="pay-btn pay-btn-green" style="margin-top:8px;padding:6px 14px;font-size:12px" onclick="openPayModal('${pid}','rent')">
            <i class="fa-solid fa-plus"></i> Pay Now
          </button>
        </div>
      </div>
      <div class="rtc-months">
        ${months
                  .map((m, i) => {
                    const mKey = m + " " + new Date().getFullYear();
                    const isPaid = paidMonths.some((pm) => pm === mKey);
                    const isPast = i < currentMonth;
                    const isCurrent = i === currentMonth;
                    const cls = isPaid
                      ? "rtm-paid"
                      : isPast
                        ? "rtm-overdue"
                        : isCurrent
                          ? "rtm-upcoming"
                          : "";
                    const title = isPaid
                      ? "Paid"
                      : isPast
                        ? "Overdue"
                        : isCurrent
                          ? "This month"
                          : "Upcoming";
                    return `<div class="rtc-month ${cls}" title="${m} — ${title}">${m.substring(0, 1)}</div>`;
                  })
                  .join("")}
      </div>
      <div style="font-size:11px;color:var(--txt3);margin-top:8px;display:flex;gap:14px">
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--green);margin-right:4px"></span>Paid (${paidMonths.length})</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--coral);margin-right:4px"></span>Overdue</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--gold);margin-right:4px"></span>Upcoming</span>
      </div>
    </div>`;
            })
            .join("")}`
          : ""
        }

  <div class="section-header" style="margin-top:24px"><div><div class="section-title">Transaction History</div><div class="section-subtitle">${txns.length} transaction${txns.length !== 1 ? "s" : ""}</div></div></div>

  ${txns.length
          ? `
  <div class="table-wrap">
    <table><thead><tr><th>Property</th><th>Type</th><th>Amount</th><th>Method</th><th>Date</th><th>Status</th></tr></thead>
    <tbody>
    ${txns
            .slice()
            .reverse()
            .map((t) => {
              const p = props.find((pr) => pr.id === t.propId);
              const methodIcon =
                { upi: "📱", netbanking: "🏦", card: "💳" }[t.method] || "💰";
              return `<tr>
        <td><b style="font-size:13px">${p ? p.title.substring(0, 24) + "…" : "Unknown"}</b><br><span style="font-size:11px;color:var(--txt3)">${p ? p.area + ", " + p.district : ""}</span></td>
        <td><span class="status-pill" style="background:${t.type === "buy" ? "rgba(124,58,237,.12)" : "var(--cream2)"};color:${t.type === "buy" ? "var(--purple)" : "var(--navy)"};font-size:10px">${t.type === "buy" ? "PURCHASE" : "RENT"} ${t.freq === "yearly" ? "(YEARLY)" : ""}</span></td>
        <td><b style="color:var(--green)">${fmt(t.amount)}</b></td>
        <td>${methodIcon} ${t.method.toUpperCase()}</td>
        <td style="font-size:13px">${t.date}</td>
        <td><span class="status-pill status-active">PAID ✓</span></td>
      </tr>`;
            })
            .join("")}
    </tbody></table>
  </div>`
          : `
  <div class="empty-state">
    <i class="fa-solid fa-receipt"></i>
    <h3>No transactions yet</h3>
    <p>Browse properties and make your first payment</p>
    <button class="btn btn-gold" onclick="setTenantView('search')"><i class="fa-solid fa-magnifying-glass"></i> Browse Properties</button>
  </div>`
        }
  `;
    }

    // ============================================================
    // OWNER RENT TRACKER VIEW
    // ============================================================
    function buildOwnerRentTracker() {
      const myProps = DB.getProperties().filter(
        (p) => p.ownerId === currentUser.id && p.isForRent,
      );
      const txns = DB.getTransactions();
      const users = DB.getUsers();
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const allMyTxns = txns.filter((t) =>
        myProps.find((p) => p.id === t.propId),
      );
      const totalCollected = allMyTxns.reduce((a, t) => a + t.amount, 0);
      const thisMonth = months[currentMonth] + " " + currentYear;
      const thisMonthAmt = allMyTxns
        .filter((t) => t.month === thisMonth)
        .reduce((a, t) => a + t.amount, 0);
      const expectedMonthly = myProps.reduce((a, p) => a + (p.rent || 0), 0);

      return `
  <div style="background:linear-gradient(135deg,var(--green),#059669);border-radius:var(--radius2);padding:28px;margin-bottom:24px;position:relative;overflow:hidden">
    <div style="position:absolute;right:24px;top:50%;transform:translateY(-50%);font-size:80px;opacity:.1">💰</div>
    <h2 style="color:#fff;font-family:'Playfair Display',serif;font-size:26px;font-weight:700;margin-bottom:4px">Rent Collection Tracker</h2>
    <p style="color:rgba(255,255,255,.7);font-size:14px">Live tracking of rent payments from tenants</p>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px">
    <div class="stat-card sc-green"><div class="stat-icon"><i class="fa-solid fa-coins"></i></div><div class="stat-val">${fmt(totalCollected)}</div><div class="stat-label">Total Collected</div></div>
    <div class="stat-card sc-gold"><div class="stat-icon"><i class="fa-solid fa-calendar-check"></i></div><div class="stat-val">${fmt(thisMonthAmt)}</div><div class="stat-label">This Month</div></div>
    <div class="stat-card sc-coral"><div class="stat-icon"><i class="fa-solid fa-house-crack"></i></div><div class="stat-val">${fmt(expectedMonthly)}</div><div class="stat-label">Expected/Month</div></div>
    <div class="stat-card sc-purple"><div class="stat-icon"><i class="fa-solid fa-percent"></i></div><div class="stat-val">${expectedMonthly ? Math.min(100, Math.round((thisMonthAmt / expectedMonthly) * 100)) : 0}%</div><div class="stat-label">Collection Rate</div></div>
  </div>

  <div class="section-header"><div><div class="section-title">Property-wise Rent Status</div><div class="section-subtitle">Track payments per property</div></div></div>

  ${myProps.length
          ? myProps
            .map((p) => {
              const propTxns = txns.filter((t) => t.propId === p.id);
              const paidMonths = propTxns.flatMap(
                (t) => t.coveredMonths || [t.month],
              );
              const totalForProp = propTxns.reduce((a, t) => a + t.amount, 0);
              const tenant = users.find(
                (u) => propTxns.length && u.id === propTxns[0].tenantId,
              );
              const thisMonthPaid = paidMonths.includes(thisMonth);
              const pct = Math.min(100, propTxns.length * 8);

              return `
    <div class="rent-track-card">
      <div class="rtc-head" style="align-items:flex-start">
        <div style="width:56px;height:56px;border-radius:10px;overflow:hidden;flex-shrink:0;background:var(--cream2);display:flex;align-items:center;justify-content:center;margin-right:12px">
          ${p.photos && p.photos[0] ? `<img src="${p.photos[0]}" style="width:100%;height:100%;object-fit:cover">` : `<i class="fa-solid fa-house" style="color:var(--txt3);font-size:20px"></i>`}
        </div>
        <div style="flex:1">
          <div class="rtc-prop">${p.title}</div>
          <div class="rtc-loc"><i class="fa-solid fa-location-dot" style="color:var(--gold3);font-size:11px"></i> ${p.area}, ${p.district}</div>
          ${tenant ? `<div style="font-size:11px;color:var(--txt2);margin-top:4px"><i class="fa-solid fa-user" style="color:var(--purple)"></i> Tenant: <b>${tenant.name}</b> · ${tenant.phone}</div>` : '<div style="font-size:11px;color:var(--txt3);margin-top:4px">No tenant yet</div>'}
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--txt3)">Monthly Rent</div>
          <div style="font-size:20px;font-weight:700;color:var(--navy);font-family:Playfair Display,serif">${fmt(p.rent)}</div>
          <div style="margin-top:6px">
            <span class="status-pill ${thisMonthPaid ? "status-active" : "status-pending"}" style="font-size:11px">
              ${thisMonthPaid ? "✓ This Month Paid" : "⏳ Awaiting Payment"}
            </span>
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--txt2);margin-bottom:4px">
        <span>Total Collected: <b style="color:var(--green)">${fmt(totalForProp)}</b></span>
        <span>${propTxns.length} payment${propTxns.length !== 1 ? "s" : ""}</span>
      </div>
      <div class="rtc-progress-bar">
        <div class="rtc-progress-fill" style="width:${pct}%"></div>
      </div>

      <div class="rtc-months">
        ${months
                  .map((m, i) => {
                    const mKey = m + " " + currentYear;
                    const isPaid = paidMonths.includes(mKey);
                    const isPast = i < currentMonth;
                    const isCurrent = i === currentMonth;
                    const cls = isPaid
                      ? "rtm-paid"
                      : isPast
                        ? "rtm-overdue"
                        : isCurrent
                          ? "rtm-upcoming"
                          : "";
                    const title = isPaid
                      ? m + " — Paid ✓"
                      : isPast
                        ? m + " — Not Received"
                        : isCurrent
                          ? m + " — Current"
                          : "";
                    return `<div class="rtc-month ${cls}" title="${title}" style="font-size:10px">${m.substring(0, 1)}</div>`;
                  })
                  .join("")}
      </div>

      ${propTxns.length
                  ? `
      <div style="margin-top:12px">
        <div style="font-size:12px;font-weight:700;color:var(--txt2);margin-bottom:8px">Payment History</div>
        ${propTxns
                    .slice(-4)
                    .reverse()
                    .map((t) => {
                      const tenant2 = users.find((u) => u.id === t.tenantId);
                      return `<div class="pay-history-row">
            <div><b style="font-size:13px">${t.month}</b> &nbsp;·&nbsp; <span style="font-size:12px;color:var(--txt2)">${tenant2 ? tenant2.name : "Tenant"}</span></div>
            <div style="display:flex;align-items:center;gap:10px">
              <b style="color:var(--green)">${fmt(t.amount)}</b>
              <span class="status-pill status-active" style="font-size:10px">RECEIVED</span>
            </div>
          </div>`;
                    })
                    .join("")}
      </div>`
                  : ""
                }
    </div>`;
            })
            .join("")
          : `<div class="empty-state"><i class="fa-solid fa-house-circle-exclamation"></i><h3>No rentable properties</h3><p>Add a rental property to start tracking payments</p></div>`
        }

  <div class="section-header" style="margin-top:24px"><div><div class="section-title">All Received Payments</div></div></div>
  ${allMyTxns.length
          ? `
  <div class="table-wrap"><table><thead><tr><th>Property</th><th>Tenant</th><th>Month</th><th>Amount</th><th>Method</th><th>Date</th></tr></thead><tbody>
  ${allMyTxns
            .slice()
            .reverse()
            .map((t) => {
              const p = myProps.find((pr) => pr.id === t.propId);
              const tenant = users.find((u) => u.id === t.tenantId);
              const mIcon =
                { upi: "📱", netbanking: "🏦", card: "💳" }[t.method] || "💰";
              return `<tr>
      <td style="font-size:13px"><b>${p ? p.title.substring(0, 20) + "…" : "—"}</b></td>
      <td style="font-size:13px">${tenant ? tenant.name : "—"}</td>
      <td style="font-size:13px">${t.month}</td>
      <td><b style="color:var(--green)">${fmt(t.amount)}</b></td>
      <td style="font-size:13px">${mIcon} ${t.method}</td>
      <td style="font-size:12px">${t.date}</td>
    </tr>`;
            })
            .join("")}
  </tbody></table></div>`
          : `<div class="empty-state" style="padding:30px"><i class="fa-solid fa-coins"></i><h3>No payments received yet</h3><p>Payments from tenants will appear here</p></div>`
        }
  `;
    }

    // ============================================================
    // LIVE DATA SYNC — real-time notifications & auto-refresh
    // ============================================================
    const _adminLastKnownUsers = { count: 0 };
    const _liveState = {
      adminUserCount: 0,
      adminPropCount: 0,
      adminInqCount: 0,
      ownerInqCount: 0,
      tenantPropCount: 0,
    };

    function checkNewAdminNotifs() {
      const users = DB.getUsers();
      if (
        _adminLastKnownUsers.count > 0 &&
        users.length > _adminLastKnownUsers.count
      ) {
        const newCount = users.length - _adminLastKnownUsers.count;
        toast(
          `${newCount} new user${newCount > 1 ? "s" : ""} registered! 🎉`,
        );
      }
      _adminLastKnownUsers.count = users.length;
    }

    // Poll every 4 seconds for live data sync
    setInterval(() => {
      if (!currentUser) return;

      // ── ADMIN: refresh on any data change ──
      if (currentUser.role === "admin") {
        const users = DB.getUsers();
        const props = DB.getProperties();
        const inqs = DB.getInquiries();

        // Toast for new user registrations
        if (_liveState.adminUserCount > 0 && users.length > _liveState.adminUserCount) {
          const n = users.length - _liveState.adminUserCount;
          toast(`${n} new user${n > 1 ? "s" : ""} registered! 👤`, "success");
        }
        // Toast for new property listings
        if (_liveState.adminPropCount > 0 && props.length > _liveState.adminPropCount) {
          const n = props.length - _liveState.adminPropCount;
          toast(`${n} new property listing${n > 1 ? "s" : ""} added! 🏠`, "success");
        }
        // Toast for new inquiries
        if (_liveState.adminInqCount > 0 && inqs.length > _liveState.adminInqCount) {
          const n = inqs.length - _liveState.adminInqCount;
          toast(`${n} new inquiry${n > 1 ? "ies" : ""} received! 📬`, "info");
        }
        _liveState.adminUserCount = users.length;
        _liveState.adminPropCount = props.length;
        _liveState.adminInqCount = inqs.length;
        _adminLastKnownUsers.count = users.length;

        // Auto-refresh admin panel
        renderAdminContent();
        // Update navbar counts
        buildNavbar(document.getElementById("adminNavbar"), "admin");
      }

      // ── OWNER: refresh when new inquiry arrives ──
      if (currentUser.role === "owner") {
        const myProps = DB.getProperties().filter((p) => p.ownerId === currentUser.id);
        const myPropIds = myProps.map((p) => p.id);
        const myInqs = DB.getInquiries().filter((i) => myPropIds.includes(i.propId));

        if (_liveState.ownerInqCount > 0 && myInqs.length > _liveState.ownerInqCount) {
          const n = myInqs.length - _liveState.ownerInqCount;
          const newest = myInqs[myInqs.length - 1];
          const who = newest.tenantName || "A tenant";
          toast(`📬 ${who} sent you ${n > 1 ? n + " new inquiries" : "an inquiry"}!`, "success");
          // Auto-refresh if on dashboard or inquiries section
          if (currentOwnerView === "dashboard") renderOwnerContent();
        } else if (myInqs.length !== _liveState.ownerInqCount && currentOwnerView === "dashboard") {
          renderOwnerContent();
        }
        _liveState.ownerInqCount = myInqs.length;
      }

      // ── TENANT: refresh property grid when owner adds new listing ──
      if (currentUser.role === "tenant") {
        const props = DB.getProperties().filter((p) => p.status === "active");
        if (_liveState.tenantPropCount > 0 && props.length > _liveState.tenantPropCount) {
          const n = props.length - _liveState.tenantPropCount;
          toast(`${n} new propert${n > 1 ? "ies" : "y"} listed! 🏠 Check Browse`, "info");
        }
        _liveState.tenantPropCount = props.length;

        if (currentTenantView === "search") {
          const pg = document.getElementById("propResults");
          if (pg) pg.innerHTML = renderPropGrid();
        }
      }
    }, 4000);

    // Initialize live state counters when user logs in
    function initLiveState() {
      _liveState.adminUserCount = DB.getUsers().length;
      _liveState.adminPropCount = DB.getProperties().length;
      _liveState.adminInqCount = DB.getInquiries().length;
      if (currentUser && currentUser.role === "owner") {
        const myProps = DB.getProperties().filter((p) => p.ownerId === currentUser.id);
        const myPropIds = myProps.map((p) => p.id);
        _liveState.ownerInqCount = DB.getInquiries().filter((i) => myPropIds.includes(i.propId)).length;
      }
      _liveState.tenantPropCount = DB.getProperties().filter((p) => p.status === "active").length;
    }