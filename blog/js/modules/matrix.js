// Educational matrix-transform cipher (reversible). Small n demo (n=3)
const CHAR_MAP = (() => {
  const m = {};
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ';
  for (let i=0;i<letters.length;i++) m[letters[i]] = i+1;
  return m;
})();
const REV_MAP = (() => {
  const r = {};
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ';
  for (let i=0;i<letters.length;i++) r[i+1] = letters[i];
  return r;
})();

function textToNumbers(text, n) {
  const len = n*n;
  const padded = text.padEnd(len, ' ');
  const arr = padded.slice(0, len).split('').map(ch => CHAR_MAP[ch] || 27);
  const matrix = [];
  for (let i=0;i<n;i++) matrix.push(arr.slice(i*n, i*n + n));
  return matrix;
}
function numbersToText(matrix) {
  const flat = matrix.flat();
  return flat.map(v => REV_MAP[v] || ' ').join('').trim();
}
function randomInt(max) { return Math.floor(Math.random()*max); }

function matMul(A, B, p) {
  const n = A.length; const m = B[0].length;
  const r = Array.from({length:n}, () => Array.from({length:m}, ()=>0));
  for (let i=0;i<n;i++) for (let j=0;j<m;j++) {
    let s = 0;
    for (let k=0;k<A[i].length;k++) s += A[i][k]*B[k][j];
    r[i][j] = ((s % p) + p) % p;
  }
  return r;
}

// generate non-singular small matrix mod p
function generateKeyMatrix(n, p) {
  while (true) {
    const A = Array.from({length:n}, () => Array.from({length:n}, () => randomInt(p)));
    if (modMatrixDeterminant(A, p) % p !== 0) return A;
  }
}
function modMatrixDeterminant(mat, p) {
  const n = mat.length;
  if (n === 1) return ((mat[0][0] % p) + p) % p;
  let det = 0;
  for (let c = 0; c < n; c++) {
    const sub = mat.slice(1).map(r => r.filter((_,i)=>i!==c));
    det += ((c%2===0?1:-1) * mat[0][c] * modMatrixDeterminant(sub, p));
    det %= p;
  }
  return ((det % p) + p) % p;
}

// small LU implementation (Crout-like)
function luDecomposeCrout(A, p) {
  const n = A.length;
  const L = Array.from({length:n}, (_,i)=>Array.from({length:n}, (_,j)=> (i===j?1:0)));
  const U = Array.from({length:n}, ()=>Array.from({length:n}, ()=>0));
  for (let j=0;j<n;j++) {
    for (let i=0;i<=j;i++) {
      let s = 0;
      for (let k=0;k<i;k++) s += L[i][k]*U[k][j];
      U[i][j] = ((A[i][j] - s) % p + p) % p;
    }
    for (let i=j+1;i<n;i++) {
      let s = 0;
      for (let k=0;k<j;k++) s += L[i][k]*U[k][j];
      const denom = U[j][j];
      if (denom === 0) throw new Error('LU failed (zero pivot)');
      const invDen = modInverse(denom, p);
      L[i][j] = ((A[i][j] - s) * invDen) % p;
      L[i][j] = ((L[i][j] % p) + p) % p;
    }
  }
  return {L, U};
}
function egcd(a,b){ if (b===0) return {g:a,x:1,y:0}; const r=egcd(b,a%b); return {g:r.g,x:r.y,y:r.x - Math.floor(a/b)*r.y}; }
function modInverse(a,m){ const r=egcd(a,m); if (r.g!==1) throw new Error('No modular inverse'); return ((r.x % m)+m)%m; }

function invertLowerTriangular(L, p) {
  const n = L.length;
  const X = Array.from({length:n}, ()=>Array.from({length:n}, ()=>0));
  for (let col = 0; col < n; col++) {
    const b = Array.from({length:n}, (_,i)=> i===col?1:0);
    const y = Array(n).fill(0);
    for (let i=0;i<n;i++) {
      let s = 0;
      for (let k=0;k<i;k++) s += L[i][k]*y[k];
      y[i] = ((b[i] - s) % p + p) % p;
    }
    for (let i=0;i<n;i++) X[i][col] = y[i];
  }
  return X;
}

// forward/inverse transform (simple polynomial evaluation + solve)
function forwardTransform(B, p) {
  const n = B.length;
  const s = 3 + randomInt(5);
  const vals = [];
  for (let col=0; col<n; col++) {
    const coeffs = B.map(row => row[col]);
    const out = [];
    for (let pow=1; pow<=n; pow++) {
      let sum = 0;
      for (let k=0;k<n;k++) sum += coeffs[k] * Math.pow(s, pow+k);
      out.push(((sum % p) + p) % p);
    }
    vals.push(out);
  }
  return {s, vals};
}
function inverseTransform(vals, s, p) {
  const n = vals.length;
  const coeffsByCol = [];
  for (let col=0; col<n; col++) {
    const rhs = vals[col];
    const M = Array.from({length:n}, (_,r)=>Array.from({length:n}, (_,k)=> Math.pow(s, r + k + 1) % p));
    const coeffs = solveLinearMod(M, rhs, p);
    coeffsByCol.push(coeffs);
  }
  const B = Array.from({length:n}, ()=>Array.from({length:n}, ()=>0));
  for (let col=0; col<n; col++) for (let row=0; row<n; row++) B[row][col] = ((coeffsByCol[col][row] % p) + p) % p;
  return B;
}
function solveLinearMod(A,b,p) {
  const n = A.length;
  const M = A.map((row,i) => row.map(x=>((x%p)+p)%p).concat([((b[i]%p)+p)%p]));
  for (let i=0;i<n;i++) {
    let pivot = i;
    for (let r=i;r<n;r++) if (M[r][i] !== 0) { pivot = r; break; }
    if (M[pivot][i] === 0) throw new Error('Singular matrix in solver');
    if (pivot !== i) { const tmp = M[i]; M[i] = M[pivot]; M[pivot] = tmp; }
    const inv = modInverse(M[i][i], p);
    for (let c=i;c<=n;c++) M[i][c] = (M[i][c] * inv) % p;
    for (let r=i+1;r<n;r++) {
      const factor = M[r][i];
      for (let c=i;c<=n;c++) M[r][c] = ((M[r][c] - factor * M[i][c]) % p + p) % p;
    }
  }
  const x = Array(n).fill(0);
  for (let i=n-1;i>=0;i--) {
    let s = M[i][n];
    for (let c=i+1;c<n;c++) s = ((s - M[i][c]*x[c])%p + p) % p;
    x[i] = s;
  }
  return x;
}

/* API */
export function matrixToHtml(M) {
  return '<table class="border-collapse"><tbody>' + M.map(row => '<tr>' + row.map(v => `<td class="px-3 py-1 border">${v}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
}

export function encryptMessage(plaintext) {
  const n = 3;
  const P = 37;
  const M = textToNumbers(plaintext.toUpperCase(), n);
  const A = generateKeyMatrix(n, P);
  const Cons = matMul(A, M, P);
  const {L, U} = luDecomposeCrout(A, P);
  const Linv = invertLowerTriangular(L, P);
  const B = matMul(Linv, Cons, P);
  const {s, vals} = forwardTransform(B, P);
  const pkg = {n, P, A, L, U, s, vals};
  const cipherString = btoa(JSON.stringify({meta:{n,P,s}, vals}));
  return { matrix: M, package: pkg, ciphertext: cipherString };
}

export function decryptPackage(pkg) {
  const {n, P, A, L, U, s, vals} = pkg;
  const B = inverseTransform(vals, s, P);
  const Cons = matMul(L, B, P);
  const M = Array.from({length:n}, ()=>Array.from({length:n}, ()=>0));
  for (let col=0;col<n;col++) {
    const rhs = Cons.map(row => row[col]);
    const sol = solveLinearMod(A, rhs, P);
    for (let row=0;row<n;row++) M[row][col] = ((sol[row] % P) + P) % P;
  }
  const plaintext = numbersToText(M);
  return {matrix: M, plaintext};
}
